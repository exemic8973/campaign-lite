import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}

  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    db: dbOk ? "connected" : "error",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }, { status: dbOk ? 200 : 503 });
}
