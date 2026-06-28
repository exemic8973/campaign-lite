import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { z } from "zod";

export async function GET(request: NextRequest) {
  return withOrg(async ({ orgId, req }) => {
    const { searchParams } = new URL(req.url);
    const segmentId = searchParams.get("segmentId");
    if (!segmentId) return NextResponse.json({ error: "Missing segmentId" }, { status: 400 });

    const segment = await prisma.segment.findFirst({ where: { id: segmentId, organizationId: orgId }, select: { id: true } });
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const members = await prisma.segmentMember.findMany({
      where: { segmentId },
      include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    return NextResponse.json(members.map((m) => m.contact));
  })(request);
}

const memberSchema = z.object({
  segmentId: z.string(),
  contactId: z.string(),
});

export async function POST(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const { segmentId, contactId } = input as z.infer<typeof memberSchema>;

    const segment = await prisma.segment.findFirst({ where: { id: segmentId, organizationId: orgId }, select: { id: true } });
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId: orgId }, select: { id: true } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    await prisma.segmentMember.upsert({
      where: { segmentId_contactId: { segmentId, contactId } },
      update: {},
      create: { segmentId, contactId },
    });

    const count = await prisma.segmentMember.count({ where: { segmentId } });
    await prisma.segment.update({ where: { id: segmentId }, data: { contactCount: count } });
    return NextResponse.json({ ok: true });
  }, { schema: memberSchema })(request);
}

export async function DELETE(request: NextRequest) {
  return withOrg(async ({ orgId, req }) => {
    const { searchParams } = new URL(req.url);
    const segmentId = searchParams.get("segmentId");
    const contactId = searchParams.get("contactId");
    if (!segmentId || !contactId) return NextResponse.json({ error: "Missing segmentId or contactId" }, { status: 400 });

    const segment = await prisma.segment.findFirst({ where: { id: segmentId, organizationId: orgId }, select: { id: true } });
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.segmentMember.delete({ where: { segmentId_contactId: { segmentId, contactId } } }).catch(() => {});

    const count = await prisma.segmentMember.count({ where: { segmentId } });
    await prisma.segment.update({ where: { id: segmentId }, data: { contactCount: count } });
    return NextResponse.json({ ok: true });
  })(request);
}
