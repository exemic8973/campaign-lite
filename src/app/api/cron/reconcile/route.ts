import { NextResponse } from "next/server";
import { reconcileStuckCampaigns } from "@/lib/queue";

/**
 * Cron endpoint — call every 60s to finalize any campaigns stuck in "sending".
 * Set up via Vercel Cron Jobs or an external scheduler.
 */
export async function GET() {
  await reconcileStuckCampaigns();
  return NextResponse.json({ ok: true });
}
