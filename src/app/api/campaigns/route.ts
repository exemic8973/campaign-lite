import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, type: true, status: true, totalRecipients: true,
      sentCount: true, openCount: true, clickCount: true,
      createdAt: true, scheduledAt: true, sentAt: true,
    },
  });
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      type: body.type || "email",
      status: "draft",
      subject: body.subject || null,
      fromName: body.fromName || null,
      fromEmail: body.fromEmail || null,
      trackOpens: body.trackOpens ?? true,
      trackClicks: body.trackClicks ?? true,
      isAbTest: body.isAbTest ?? false,
      subjectB: body.subjectB || null,
      splitPercent: body.splitPercent ?? 50,
      templateId: body.templateId || null,
      segmentId: body.segmentId || null,
      organizationId: orgId,
    },
  });
  return NextResponse.json(campaign);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || body.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      name: body.name, subject: body.subject,
      fromName: body.fromName, fromEmail: body.fromEmail,
      status: body.status,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      trackOpens: body.trackOpens, trackClicks: body.trackClicks,
      templateId: body.templateId || undefined,
      segmentId: body.segmentId || undefined,
    },
  });
  return NextResponse.json(campaign);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
