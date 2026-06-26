import { Queue, Worker, ConnectionOptions } from "bullmq";
import { sendCampaignEmail, loadSmtpConfig, replaceVariables } from "./email";
import { prisma } from "./db";

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

// Queue for individual recipient emails
export const emailQueue = new Queue("campaign-emails", { connection });

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

// Worker processes jobs
const worker = new Worker("campaign-emails", async (job) => {
  const data = job.data as EmailJob;
  const smtp = await loadSmtpConfig(data.orgId);

  await sendCampaignEmail({
    to: [data.to],
    subject: data.subject,
    html: data.html,
    fromName: data.fromName,
    fromEmail: data.fromEmail,
    campaignId: data.campaignId,
    trackingPixel: data.trackingPixel,
    smtp,
  });

  // Record sent event
  await prisma.campaignEvent.create({
    data: {
      type: "sent",
      recipientEmail: data.to,
      campaignId: data.campaignId,
      contactId: data.contactId,
    },
  });

  // Increment campaign sent count
  await prisma.campaign.update({
    where: { id: data.campaignId },
    data: { sentCount: { increment: 1 } },
  });

  return { sent: true };
}, { connection, concurrency: 5 });

worker.on("failed", async (job, err) => {
  if (job) {
    const data = job.data as EmailJob;
    await prisma.campaignEvent.create({
      data: {
        type: "bounce",
        recipientEmail: data.to,
        metadata: { reason: err?.message || "send_failed" },
        campaignId: data.campaignId,
        contactId: data.contactId,
      },
    });
    await prisma.campaign.update({
      where: { id: data.campaignId },
      data: { bounceCount: { increment: 1 } },
    });
  }
});

worker.on("completed", async (job) => {
  if (!job) return;
  const data = job.data as EmailJob;
  // Check if all jobs for this campaign are done
  const pending = await emailQueue.getJobCounts();
  const campaignJobs = pending.waiting + pending.active + pending.delayed;
  if (campaignJobs === 0) {
    // Wait a bit for the last job's DB write to complete
    setTimeout(async () => {
      const remaining = await emailQueue.getJobCounts();
      if (remaining.waiting + remaining.active + remaining.delayed === 0) {
        await prisma.campaign.update({
          where: { id: data.campaignId },
          data: { status: "sent", sentAt: new Date() },
        }).catch(() => {});
      }
    }, 2000);
  }
});

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
          if (operator === "contains") return { [field]: { contains: value } };
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

  // Enqueue one job per contact
  const jobs = contacts.map((contact) => {
    const variables: Record<string, string> = {
      firstName: contact.firstName || "", lastName: contact.lastName || "",
      email: contact.email || "", phone: contact.phone || "",
      unsubscribeUrl: `${baseUrl}/api/unsubscribe?contactId=${contact.id}&campaignId=${campaignId}`,
    };
    const trackingPixel = campaign.trackOpens
      ? `${baseUrl}/api/track/open?campaignId=${campaignId}&contactId=${contact.id}`
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

  await emailQueue.addBulk(jobs);
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "sending", totalRecipients: contacts.length },
  });

  return contacts.length;
}
