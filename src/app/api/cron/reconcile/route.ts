import { NextRequest, NextResponse } from "next/server";
import { reconcileStuckCampaigns } from "@/lib/queue";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Cron endpoint — runs every ~60s to finalize campaigns stuck in "sending".
 * Protected by CRON_SECRET (must be set in env). Accepts either:
 *   ?secret=<CRON_SECRET>           for external schedulers
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // Accept query param or Authorization header
  const querySecret = req.nextUrl.searchParams.get("secret");
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const provided = querySecret || bearerToken;
  if (!provided || !constantTimeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await reconcileStuckCampaigns();
  return NextResponse.json({ ok: true });
}
