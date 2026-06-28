import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOrg(async ({ orgId }) => {
    const { id } = await params;

    const owns = await prisma.campaign.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
    if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
      stats: { sent: statsMap.sent || 0, open: statsMap.open || 0, click: statsMap.click || 0, bounce: statsMap.bounce || 0, unsubscribe: statsMap.unsubscribe || 0 },
    });
  })(_request as any);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withOrg(async ({ orgId }) => {
    const { id } = await params;

    const owns = await prisma.campaign.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
    if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.campaignEvent.deleteMany({ where: { campaignId: id } });
    return NextResponse.json({ ok: true });
  })(_request as any);
}
