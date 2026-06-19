import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const events = await prisma.campaignEvent.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, type: true, recipientEmail: true, createdAt: true },
  });

  const stats = await prisma.campaignEvent.groupBy({
    by: ["type"],
    where: { campaignId: id },
    _count: true,
  });

  const statsMap: Record<string, number> = {};
  stats.forEach((s: { type: string; _count: number }) => { statsMap[s.type] = s._count; });

  return NextResponse.json({
    events,
    stats: {
      sent: statsMap.sent || 0,
      open: statsMap.open || 0,
      click: statsMap.click || 0,
      bounce: statsMap.bounce || 0,
      unsubscribe: statsMap.unsubscribe || 0,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.campaignEvent.deleteMany({ where: { campaignId: id } });
  return NextResponse.json({ ok: true });
}
