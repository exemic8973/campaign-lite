import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const workflows = await prisma.workflow.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { nodes: true, executions: true } } },
  });
  return NextResponse.json(workflows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  const workflow = await prisma.workflow.create({
    data: {
      name: body.name,
      description: body.description || null,
      triggerType: body.triggerType || "manual",
      triggerConfig: body.triggerConfig ? JSON.stringify(body.triggerConfig) : null,
      organizationId: orgId,
    },
  });
  return NextResponse.json(workflow);
}
