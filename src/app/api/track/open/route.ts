import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLink } from "@/lib/link-signing";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    const payload = verifyLink(token);
    if (!payload || payload.purpose !== "track") {
      // Return transparent pixel anyway to avoid broken images
      const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      return new NextResponse(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" } });
    }

    // Record open event (idempotent via campaignId+contactId+type)
    prisma.campaignEvent.create({
      data: { type: "open", campaignId: payload.campaignId, contactId: payload.contactId, metadata: { via: "signed_link" } },
    }).catch(() => {});

    prisma.campaign.update({ where: { id: payload.campaignId }, data: { openCount: { increment: 1 } } }).catch(() => {});
  } else {
    // Legacy support for old tracking pixels (without token)
    const campaignId = searchParams.get("campaignId");
    const contactId = searchParams.get("contactId");
    if (campaignId) {
      prisma.campaignEvent.create({ data: { type: "open", campaignId, contactId: contactId || undefined } }).catch(() => {});
      prisma.campaign.update({ where: { id: campaignId }, data: { openCount: { increment: 1 } } }).catch(() => {});
    }
  }

  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new NextResponse(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" } });
}
