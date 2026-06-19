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
      id: true, name: true, description: true, subject: true, category: true, createdAt: true,
    },
  });
  return NextResponse.json(templates);
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
      variables: JSON.stringify(variables),
      previewText: body.previewText || null,
      category: body.category || "marketing",
      organizationId: orgId,
    },
  });
  return NextResponse.json(template);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || body.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const variables = extractVariables(body.bodyHtml || "");
  const template = await prisma.template.update({
    where: { id },
    data: {
      name: body.name, description: body.description, subject: body.subject,
      bodyHtml: body.bodyHtml, variables: JSON.stringify(variables),
      previewText: body.previewText, category: body.category,
    },
  });
  return NextResponse.json(template);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
