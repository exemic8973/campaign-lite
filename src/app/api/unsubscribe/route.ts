import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLink } from "@/lib/link-signing";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    const payload = verifyLink(token);
    if (!payload || payload.purpose !== "unsubscribe") {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    await prisma.contact.update({
      where: { id: payload.contactId },
      data: { isSubscribed: false },
    });

    await prisma.campaignEvent.create({
      data: {
        type: "unsubscribe",
        campaignId: payload.campaignId,
        contactId: payload.contactId,
        metadata: { via: "signed_link" },
      },
    });

    await prisma.campaign.update({
      where: { id: payload.campaignId },
      data: { unsubscribeCount: { increment: 1 } },
    });
  }

  // Also support legacy contactId parameter (for existing emails in the wild)
  const contactId = searchParams.get("contactId");
  const campaignId = searchParams.get("campaignId");
  if (contactId && campaignId && !token) {
    await prisma.contact.update({ where: { id: contactId }, data: { isSubscribed: false } });
    await prisma.campaignEvent.create({ data: { type: "unsubscribe", campaignId, contactId } });
    await prisma.campaign.update({ where: { id: campaignId }, data: { unsubscribeCount: { increment: 1 } } });
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#111}p{max-width:400px;text-align:center;line-height:1.6}</style>
</head><body><p>You have been unsubscribed. You will no longer receive emails from this sender.</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
