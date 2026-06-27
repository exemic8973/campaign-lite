import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const templates = await prisma.template.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, description: true, subject: true, category: true, createdAt: true, variables: true,
    },
  });
  // Serialize arrays for backward compat
  const serialized = templates.map(t => ({ ...t, variables: JSON.stringify(t.variables || []) }));
  return NextResponse.json(serialized);
}

function extractVariables(bodyHtml: string): string[] {
  const matches = bodyHtml.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((v) => v.replace(/[{}]/g, "")))];
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
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
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  const { searchParams } = new URL(request.url);
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
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { count } = await prisma.template.deleteMany({ where: { id, organizationId: orgId } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
