import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Resend webhook receiver for bounces, complaints, and deliveries
// Configure in Resend Dashboard → Webhooks → POST to /api/webhooks/email
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, data } = body;

  // Resend webhook format: { type: "email.bounced" | "email.delivered" | "email.complained", data: { to, email_id, ... } }
  if (!type || !data?.to) {
    return NextResponse.json({ ok: false, error: "Invalid webhook payload" }, { status: 400 });
  }

  const email = Array.isArray(data.to) ? data.to[0] : data.to;

  // Map Resend event types to our internal types
  const eventTypeMap: Record<string, string> = {
    "email.bounced": "bounce",
    "email.delivered": "sent",
    "email.complained": "complaint",
    "email.opened": "open",
    "email.clicked": "click",
  };

  const eventType = eventTypeMap[type] || type;

  // Extract campaign ID from headers or metadata
  const campaignId = data?.headers?.["X-Campaign-Id"] || data?.metadata?.campaign_id;

  if (campaignId) {
    const contact = await prisma.contact.findFirst({ where: { email } });

    await prisma.campaignEvent.create({
      data: {
        type: eventType,
        recipientEmail: email,
        metadata: data || {},
        campaignId,
        contactId: contact?.id || null,
      },
    });

    // Update campaign counts
    const updateField = eventType === "bounce" ? "bounceCount"
      : eventType === "complaint" ? "unsubscribeCount"
      : eventType === "open" ? "openCount"
      : eventType === "click" ? "clickCount"
      : null;

    if (updateField) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { [updateField]: { increment: 1 } },
      });
    }

    // Unsubscribe on complaint
    if (eventType === "complaint" && contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { isSubscribed: false },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
