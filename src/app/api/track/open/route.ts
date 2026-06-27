import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLink } from "@/lib/link-signing";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = (await import("@/lib/rate-limit")).rateLimit(`track:${ip}`, { maxRequests: 300, windowMs: 60000 });
  if (!allowed) { const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"); return new NextResponse(gif, { headers: { "Content-Type": "image/gif" } }); }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    return new NextResponse(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" } });
  }

  const payload = verifyLink(token);
  if (!payload || payload.purpose !== "track") {
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    return new NextResponse(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" } });
  }

  // Record open event (idempotent via campaignId+contactId+type)
  const campaignId = payload.campaignId!;
  const contactId = payload.contactId!;
  prisma.campaignEvent.create({
    data: { type: "open", campaignId, contactId, metadata: { via: "signed_link" } },
  }).catch(() => {});

  prisma.campaign.update({ where: { id: campaignId }, data: { openCount: { increment: 1 } } }).catch(() => {});

  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new NextResponse(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" } });
}
