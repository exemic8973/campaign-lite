import { Queue, Worker, ConnectionOptions } from "bullmq";
import { sendCampaignEmail, loadSmtpConfig, replaceVariables } from "./email";
import { prisma } from "./db";
import { signLink } from "./link-signing";

const REDIS_AVAILABLE = !!process.env.REDIS_HOST;

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

// Queue for individual recipient emails (only if Redis is available)
export const emailQueue = REDIS_AVAILABLE
  ? new Queue("campaign-emails", { connection })
  : null;

interface EmailJob {
  campaignId: string;
  contactId: string;
  to: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  orgId: string;
  trackingPixel?: string;
}

// Worker processes jobs (only if Redis is available)
// Redis-based worker (only when Redis is available)
function startWorker() {
  if (!REDIS_AVAILABLE) return null;

  const w = new Worker("campaign-emails", async (job) => {
    const data = job.data as EmailJob;
    const smtp = await loadSmtpConfig(data.orgId);

    await sendCampaignEmail({
      to: [data.to], subject: data.subject, html: data.html,
      fromName: data.fromName, fromEmail: data.fromEmail,
      campaignId: data.campaignId, trackingPixel: data.trackingPixel, smtp,
    });

    await prisma.campaignEvent.create({
      data: { type: "sent", recipientEmail: data.to, campaignId: data.campaignId, contactId: data.contactId },
    });
    await prisma.campaign.update({
      where: { id: data.campaignId },
      data: { sentCount: { increment: 1 } },
    });
    return { sent: true };
  }, { connection, concurrency: 5 });

  w.on("failed", async (job, err) => {
    if (!job) return;
    const data = job.data as EmailJob;
    await prisma.campaignEvent.create({
      data: { type: "bounce", recipientEmail: data.to, metadata: { reason: err?.message || "send_failed" }, campaignId: data.campaignId, contactId: data.contactId },
    });
    await prisma.campaign.update({
      where: { id: data.campaignId },
      data: { bounceCount: { increment: 1 } },
    });
  });

  w.on("completed", async (job) => {
    if (!job) return;
    const data = job.data as EmailJob;
    // Per-campaign completion: check this campaign's events vs totalRecipients
    await finalizeCampaignIfDone(data.campaignId);
  });

  w.on("failed", async (job) => {
    if (!job) return;
    const data = job.data as EmailJob;
    // Also check on failure — the campaign might be done even with bounces
    if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
      await finalizeCampaignIfDone(data.campaignId);
    }
  });

  return w;
}

const worker = startWorker();
// Keep worker reference alive (used in server environments with Redis)
void worker;

/**
 * Check if a campaign is fully sent/bounced and finalize its status.
 * Call on every job completion/failure — idempotent.
 */
export async function finalizeCampaignIfDone(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true, totalRecipients: true },
    });
    if (!campaign || campaign.status !== "sending") return;
    if (campaign.totalRecipients === 0) return;

    const delivered = await prisma.campaignEvent.count({
      where: { campaignId, type: { in: ["sent", "bounce"] } },
    });

    if (delivered >= campaign.totalRecipients) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "sent", sentAt: new Date() },
      });
    }
  } catch {
    // Best-effort — reconciler will retry
  }
}

/**
 * Reconciliation sweep: find campaigns stuck in \"sending\" and finalize them
 * if all jobs are accounted for. Call periodically (e.g. every 60s).
 */
export async function reconcileStuckCampaigns() {
  try {
    const stuck = await prisma.campaign.findMany({
      where: { status: "sending" },
      select: { id: true, totalRecipients: true },
    });

    for (const c of stuck) {
      if (c.totalRecipients === 0) {
        await prisma.campaign.update({
          where: { id: c.id },
          data: { status: "sent", sentAt: new Date() },
        });
        continue;
      }

      const delivered = await prisma.campaignEvent.count({
        where: { campaignId: c.id, type: { in: ["sent", "bounce"] } },
      });

      if (delivered >= c.totalRecipients) {
        await prisma.campaign.update({
          where: { id: c.id },
          data: { status: "sent", sentAt: new Date() },
        });
      }
    }
  } catch {
    // Best-effort
  }
}

/**
 * Enqueue a campaign for sending. Returns immediately.
 */
export async function enqueueCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { template: true, segment: true },
  });
  if (!campaign) throw new Error("Campaign not found");

  // Get contacts
  let contacts: any[];
  if (campaign.segmentId) {
    const segment = await prisma.segment.findUnique({ where: { id: campaign.segmentId } });
    if (segment?.rules) {
      const rules = typeof segment.rules === "string" ? JSON.parse(segment.rules) : segment.rules;
      const where: any = { organizationId: campaign.organizationId, isSubscribed: true, email: { not: null } };
      if (rules.conditions?.length) {
        const allowedFields = new Set(["email", "phone", "firstName", "lastName", "tags", "isSubscribed", "createdAt", "source"]);
        const op = rules.logic === "or" ? "OR" : "AND";
        where[op] = rules.conditions.map((cond: any) => {
          const { field, operator, value } = cond;
          if (!allowedFields.has(field)) return { id: "" };
          if (operator === "has") return { tags: { has: value } };
          if (operator === "notHas") return { NOT: { tags: { has: value } } };
          if (field === "tags") return { tags: { has: value } };
          return { [field]: { contains: value } };
        });
      }
      contacts = await prisma.contact.findMany({ where });
    } else {
      contacts = await prisma.contact.findMany({
        where: { organizationId: campaign.organizationId, isSubscribed: true, email: { not: null } },
      });
    }
  } else {
    contacts = await prisma.contact.findMany({
      where: { organizationId: campaign.organizationId, isSubscribed: true, email: { not: null } },
    });
  }

  if (contacts.length === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "sent", sentAt: new Date(), totalRecipients: 0 } });
    return 0;
  }

  const smtp = await loadSmtpConfig(campaign.organizationId);
  const templateHtml = campaign.template?.bodyHtml || "<p>No template</p>";
  const subject = campaign.subject || campaign.template?.subject || "Campaign";
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const fromEmail = smtp?.fromEmail || campaign.fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@campaignlite.dev";
  const fromName = smtp?.fromName || campaign.fromName || "Campaign Lite";

  if (!REDIS_AVAILABLE) {
    // No Redis — send directly (synchronous, one at a time)
    let sentCount = 0;
    for (const contact of contacts) {
      try {
        const unsubToken = signLink({ contactId: contact.id, campaignId, purpose: "unsubscribe" });
        const trackToken = signLink({ contactId: contact.id, campaignId, purpose: "track" });
        const variables: Record<string, string> = {
          firstName: contact.firstName || "", lastName: contact.lastName || "",
          email: contact.email || "", phone: contact.phone || "",
          unsubscribeUrl: `${baseUrl}/api/unsubscribe?token=${unsubToken}`,
        };
        const trackingPixel = campaign.trackOpens
          ? `${baseUrl}/api/track/open?token=${trackToken}`
          : undefined;

        await sendCampaignEmail({
          to: [contact.email!],
          subject: replaceVariables(subject, variables),
          html: replaceVariables(templateHtml, variables),
          fromName, fromEmail,
          campaignId,
          trackingPixel,
          smtp,
        });

        await prisma.campaignEvent.create({
          data: { type: "sent", recipientEmail: contact.email!, campaignId, contactId: contact.id },
        });
        sentCount++;
      } catch {
        await prisma.campaignEvent.create({
          data: { type: "bounce", recipientEmail: contact.email!, campaignId, contactId: contact.id, metadata: { reason: "send_failed" } },
        });
      }
    }
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sent", sentAt: new Date(), sentCount, totalRecipients: contacts.length },
    });
    return sentCount;
  }

  // Enqueue one job per contact (Redis path)
  const jobs = contacts.map((contact) => {
    const unsubToken = signLink({ contactId: contact.id, campaignId, purpose: "unsubscribe" });
    const trackToken = signLink({ contactId: contact.id, campaignId, purpose: "track" });
    const variables: Record<string, string> = {
      firstName: contact.firstName || "", lastName: contact.lastName || "",
      email: contact.email || "", phone: contact.phone || "",
      unsubscribeUrl: `${baseUrl}/api/unsubscribe?token=${unsubToken}`,
    };
    const trackingPixel = campaign.trackOpens
      ? `${baseUrl}/api/track/open?token=${trackToken}`
      : undefined;

    return {
      name: `email-${campaignId}-${contact.id}`,
      data: {
        campaignId, contactId: contact.id, to: contact.email!,
        subject: replaceVariables(subject, variables),
        html: replaceVariables(templateHtml, variables),
        fromName, fromEmail, orgId: campaign.organizationId, trackingPixel,
      } as EmailJob,
      opts: { jobId: `${campaignId}-${contact.id}`, removeOnComplete: true, removeOnFail: 50, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    };
  });

  await emailQueue!.addBulk(jobs);
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "sending", totalRecipients: contacts.length },
  });

  return contacts.length;
}
