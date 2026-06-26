import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendCampaignEmail, replaceVariables } from "@/lib/email";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, organization: { users: { some: { id: session.user.id } } } },
    include: { template: true, segment: true },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "Campaign already sent or in progress" }, { status: 400 });
  }

  // Update status to sending
  await prisma.campaign.update({ where: { id }, data: { status: "sending" } });

  // Get contacts from segment or all contacts
  type SendContact = { id: string; email: string | null; firstName: string | null; lastName: string | null; phone: string | null; organizationId: string; isSubscribed: boolean };
  let contacts: SendContact[];
  // Load SMTP config if available
  const { loadSmtpConfig } = await import("@/lib/email");
  const smtpConfig = await loadSmtpConfig(campaign.organizationId);
  const senderFrom = smtpConfig?.fromEmail || campaign.fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@campaignlite.dev";
  const senderName = smtpConfig?.fromName || campaign.fromName || "Campaign Lite";

  if (campaign.segmentId) {
    // Evaluate segment rules to find matching contacts
    const segment = await prisma.segment.findUnique({ where: { id: campaign.segmentId } });
    if (segment?.rules) {
      const rules = typeof segment.rules === "string" ? JSON.parse(segment.rules) : segment.rules;
      const where: any = { organizationId: campaign.organizationId, isSubscribed: true, email: { not: null } };
      if (rules.conditions?.length) {
        const op = rules.logic === "or" ? "OR" : "AND";
        where[op] = rules.conditions.map((cond: any) => {
          const allowedFields = new Set(["email", "phone", "firstName", "lastName", "tags", "isSubscribed", "createdAt", "source"]);
          const { field, operator, value } = cond;
          if (!allowedFields.has(field)) return { id: "" };
          if (operator === "has") return { tags: { contains: value } };
          if (operator === "notHas") return { tags: { not: { contains: value } } };
          if (operator === "equals") return { [field]: value === "true" ? true : value === "false" ? false : value };
          if (operator === "notEquals") return { [field]: { not: value === "true" ? true : value === "false" ? false : value } };
          if (operator === "contains") return { [field]: { contains: value } };
          if (operator === "before") return { [field]: { lt: new Date(value) } };
          if (operator === "after") return { [field]: { gt: new Date(value) } };
          return { [field]: { contains: value } };
        });
      }
      contacts = await prisma.contact.findMany({ where }) as any;
    } else {
      contacts = await prisma.contact.findMany({
        where: { organizationId: campaign.organizationId, isSubscribed: true, email: { not: null } },
      });
    }
  } else {
    contacts = await prisma.contact.findMany({
      where: {
        organizationId: campaign.organizationId,
        isSubscribed: true,
        email: { not: null },
      },
    });
  }

  if (contacts.length === 0) {
    await prisma.campaign.update({ where: { id }, data: { status: "sent", sentAt: new Date() } });
    return NextResponse.json({ sent: 0, message: "No contacts to send to" });
  }

  const templateHtml = campaign.template?.bodyHtml || "<p>No template</p>";
  const subject = campaign.subject || campaign.template?.subject || "Campaign from Campaign Lite";
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";

  let sent = 0;
  let failed = 0;

  // Send in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    const promises = batch.map(async (contact) => {
      try {
        const variables: Record<string, string> = {
          firstName: contact.firstName || "",
          lastName: contact.lastName || "",
          email: contact.email || "",
          phone: contact.phone || "",
          unsubscribeUrl: `${baseUrl}/api/unsubscribe?contactId=${contact.id}&campaignId=${campaign.id}`,
        };

        const personalizedHtml = replaceVariables(templateHtml, variables);
        const personalizedSubject = replaceVariables(subject, variables);

        const trackingPixel = campaign.trackOpens
          ? `${baseUrl}/api/track/open?campaignId=${campaign.id}&contactId=${contact.id}`
          : undefined;

        await sendCampaignEmail({
          to: [contact.email!],
          subject: personalizedSubject,
          html: personalizedHtml,
          fromName: senderName,
          fromEmail: senderFrom,
          campaignId: campaign.id,
          trackingPixel,
          smtp: smtpConfig,
        });

        // Record sent event
        await prisma.campaignEvent.create({
          data: {
            type: "sent",
            recipientEmail: contact.email,
            campaignId: campaign.id,
            contactId: contact.id,
          },
        });

        sent++;
      } catch {
        failed++;
        await prisma.campaignEvent.create({
          data: {
            type: "bounce",
            recipientEmail: contact.email,
            metadata: { reason: "send_failed" },
            campaignId: campaign.id,
            contactId: contact.id,
          },
        });
      }
    });

    await Promise.allSettled(promises);
  }

  // Update campaign stats
  await prisma.campaign.update({
    where: { id },
    data: {
      status: "sent",
      sentAt: new Date(),
      totalRecipients: contacts.length,
      sentCount: sent,
      bounceCount: failed,
    },
  });

  return NextResponse.json({
    sent,
    failed,
    total: contacts.length,
    message: `Sent ${sent} emails${failed > 0 ? `, ${failed} failed` : ""}`,
  });
}
