import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  const campaignId = searchParams.get("campaignId");

  if (contactId) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { isSubscribed: false },
    });

    if (campaignId) {
      await prisma.campaignEvent.create({
        data: {
          type: "unsubscribe",
          campaignId,
          contactId,
        },
      });

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { unsubscribeCount: { increment: 1 } },
      });
    }
  }

  // Return a simple HTML page
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#111}p{max-width:400px;text-align:center;line-height:1.6}</style>
</head><body><p>You have been unsubscribed. You will no longer receive emails from this sender.</p></body></html>`,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}
