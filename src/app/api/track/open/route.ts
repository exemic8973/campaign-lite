import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const contactId = searchParams.get("contactId");

  if (campaignId) {
    // Record open event (fire and forget)
    prisma.campaignEvent
      .create({
        data: {
          type: "open",
          campaignId,
          contactId: contactId || undefined,
        },
      })
      .catch(() => {});

    // Update campaign open count
    prisma.campaign
      .update({
        where: { id: campaignId },
        data: { openCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  // Return a transparent 1x1 GIF
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new NextResponse(gif, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
