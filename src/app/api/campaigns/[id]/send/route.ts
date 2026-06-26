import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";
import { enqueueCampaign } from "@/lib/queue";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId },
    include: { template: { select: { id: true, name: true } }, segment: { select: { id: true, name: true } } },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "Campaign already sent or in progress" }, { status: 400 });
  }

  try {
    const count = await enqueueCampaign(id);
    return NextResponse.json({
      queued: true,
      recipients: count,
      message: count > 0 ? `${count} emails queued for delivery` : "No contacts to send to",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
