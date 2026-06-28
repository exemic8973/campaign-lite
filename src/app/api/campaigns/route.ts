import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  return withOrg(async ({ orgId }) => {
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
  })(_req);
}

const campaignCreateSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  subject: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
  fromEmail: z.string().optional().nullable(),
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  isAbTest: z.boolean().optional(),
  subjectB: z.string().optional().nullable(),
  splitPercent: z.number().optional(),
  templateId: z.string().optional().nullable(),
  segmentId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof campaignCreateSchema>;
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
  }, { schema: campaignCreateSchema, minRole: "manager" })(request);
}

const campaignUpdateSchema = z.object({
  name: z.string().optional(),
  subject: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
  fromEmail: z.string().optional().nullable(),
  status: z.string().optional(),
  scheduledAt: z.string().optional().nullable(),
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  templateId: z.string().optional().nullable(),
  segmentId: z.string().optional().nullable(),
  id: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  return withOrg(async ({ orgId, input, req }) => {
    const body = input as z.infer<typeof campaignUpdateSchema>;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { count } = await prisma.campaign.updateMany({
      where: { id, organizationId: orgId },
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
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    return NextResponse.json(campaign);
  }, { schema: campaignUpdateSchema, minRole: "manager" })(request);
}

export async function DELETE(request: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { count } = await prisma.campaign.deleteMany({ where: { id, organizationId: orgId } });
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }, { minRole: "manager" })(request);
}
