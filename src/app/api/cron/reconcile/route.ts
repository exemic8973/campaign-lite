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
 * Protected by CRON_SECRET (set in env). Vercel Cron passes its own header;
 * accept either Vercel's x-vercel-cron header or an Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends this header automatically — accept it
  if (req.headers.get("x-vercel-cron") === "1") {
    await reconcileStuckCampaigns();
    return NextResponse.json({ ok: true });
  }

  // External callers must pass CRON_SECRET
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization") || "";
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!constantTimeEqual(auth, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await reconcileStuckCampaigns();
  return NextResponse.json({ ok: true });
}
