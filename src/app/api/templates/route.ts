import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { z } from "zod";

function extractVariables(bodyHtml: string): string[] {
  const matches = bodyHtml.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((v) => v.replace(/[{}]/g, "")))];
}

export async function GET(_req: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const templates = await prisma.template.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, description: true, subject: true, category: true, createdAt: true, variables: true,
      },
    });
    const serialized = templates.map(t => ({ ...t, variables: JSON.stringify(t.variables || []) }));
    return NextResponse.json(serialized);
  })(_req);
}

const templateSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  bodyHtml: z.string().optional(),
  previewText: z.string().optional().nullable(),
  category: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof templateSchema>;
    const variables = extractVariables(body.bodyHtml || "");
    const template = await prisma.template.create({
      data: {
        name: body.name,
        description: body.description || null,
        subject: body.subject || null,
        bodyHtml: body.bodyHtml || "",
        variables,
        previewText: body.previewText || null,
        category: body.category || "marketing",
        organizationId: orgId,
      },
    });
    return NextResponse.json({ ...template, variables: JSON.stringify(template.variables || []) });
  }, { schema: templateSchema, minRole: "manager" })(request);
}

const templateUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  bodyHtml: z.string().optional(),
  previewText: z.string().optional().nullable(),
  category: z.string().optional(),
  id: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  return withOrg(async ({ orgId, input, req }) => {
    const body = input as z.infer<typeof templateUpdateSchema>;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const variables = extractVariables(body.bodyHtml || "");
    const { count } = await prisma.template.updateMany({
      where: { id, organizationId: orgId },
      data: {
        name: body.name, description: body.description, subject: body.subject,
        bodyHtml: body.bodyHtml, variables,
        previewText: body.previewText, category: body.category,
      },
    });
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...template, variables: JSON.stringify(template.variables || []) });
  }, { schema: templateUpdateSchema, minRole: "manager" })(request);
}

export async function DELETE(request: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { count } = await prisma.template.deleteMany({ where: { id, organizationId: orgId } });
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }, { minRole: "manager" })(request);
}
