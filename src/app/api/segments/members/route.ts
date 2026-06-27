import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const segmentId = searchParams.get("segmentId");
  if (!segmentId) return NextResponse.json({ error: "Missing segmentId" }, { status: 400 });

  // Verify the segment belongs to this org
  const segment = await prisma.segment.findFirst({ where: { id: segmentId, organizationId: orgId }, select: { id: true } });
  if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.segmentMember.findMany({
    where: { segmentId },
    include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });

  return NextResponse.json(members.map((m) => m.contact));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  const { segmentId, contactId } = body;
  if (!segmentId || !contactId) return NextResponse.json({ error: "Missing segmentId or contactId" }, { status: 400 });

  // Verify the segment belongs to this org
  const segment = await prisma.segment.findFirst({ where: { id: segmentId, organizationId: orgId }, select: { id: true } });
  if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify the contact belongs to this org (reject cross-org contactIds)
  const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId: orgId }, select: { id: true } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  await prisma.segmentMember.upsert({
    where: { segmentId_contactId: { segmentId, contactId } },
    update: {},
    create: { segmentId, contactId },
  });

  // Update contact count
  const count = await prisma.segmentMember.count({ where: { segmentId } });
  await prisma.segment.update({ where: { id: segmentId }, data: { contactCount: count } });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const segmentId = searchParams.get("segmentId");
  const contactId = searchParams.get("contactId");
  if (!segmentId || !contactId) return NextResponse.json({ error: "Missing segmentId or contactId" }, { status: 400 });

  // Verify the segment belongs to this org
  const segment = await prisma.segment.findFirst({ where: { id: segmentId, organizationId: orgId }, select: { id: true } });
  if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.segmentMember.delete({ where: { segmentId_contactId: { segmentId, contactId } } }).catch(() => {});

  const count = await prisma.segmentMember.count({ where: { segmentId } });
  await prisma.segment.update({ where: { id: segmentId }, data: { contactCount: count } });

  return NextResponse.json({ ok: true });
}
