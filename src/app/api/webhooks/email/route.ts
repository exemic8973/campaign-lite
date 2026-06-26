import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Webhook } from "svix";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = rateLimit(`webhook:${ip}`, { maxRequests: 60, windowMs: 60000 });
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Verify Svix signature (Resend uses Svix)
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    try {
      const body = await request.text();
      const wh = new Webhook(secret);
      const headers: Record<string, string> = {};
      request.headers.forEach((v, k) => { headers[k] = v; });
      wh.verify(body, headers);
      return processWebhook(JSON.parse(body));
    } catch (err: any) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // Fallback: accept unsigned if no secret configured (dev mode only)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.json();
  return processWebhook(body);
}

async function processWebhook(body: any) {
  const { type, data } = body;
  if (!type || !data?.to) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const email = Array.isArray(data.to) ? data.to[0] : data.to;
  const eventTypeMap: Record<string, string> = {
    "email.bounced": "bounce", "email.delivered": "sent",
    "email.complained": "complaint", "email.opened": "open", "email.clicked": "click",
  };
  const eventType = eventTypeMap[type] || type;
  const campaignId = data?.headers?.["X-Campaign-Id"] || data?.metadata?.campaign_id;

  if (campaignId) {
    const contact = await prisma.contact.findFirst({ where: { email } });
    await prisma.campaignEvent.create({
      data: { type: eventType, recipientEmail: email, metadata: data || {}, campaignId, contactId: contact?.id || null },
    });

    const fieldMap: Record<string, string> = {
      bounce: "bounceCount", complaint: "unsubscribeCount", open: "openCount", click: "clickCount",
    };
    const updateField = fieldMap[eventType];
    if (updateField) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { [updateField]: { increment: 1 } } });
    }
    if (eventType === "complaint" && contact) {
      await prisma.contact.update({ where: { id: contact.id }, data: { isSubscribed: false } });
    }
  }

  return NextResponse.json({ ok: true });
}
