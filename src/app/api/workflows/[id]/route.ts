import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/session-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await requireOrg(session);
  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({
    where: { id, organizationId: orgId },
    include: { nodes: { orderBy: { positionY: "asc" } }, edges: true },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workflow);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await requireOrg(session);
  const { id } = await params;
  const body = await request.json();

  // Verify ownership
  const existing = await prisma.workflow.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workflow.update({
    where: { id },
    data: {
      name: body.name, description: body.description, status: body.status,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig ? JSON.stringify(body.triggerConfig) : null,
    },
  });

  if (body.nodes) {
    await prisma.workflowNode.deleteMany({ where: { workflowId: id } });
    await prisma.workflowNode.createMany({
      data: body.nodes.map((n: any) => ({
        id: n.id, workflowId: id, type: n.type || "trigger", label: n.label || null,
        config: typeof n.config === "string" ? n.config : JSON.stringify(n.config || {}),
        positionX: n.position?.x || n.positionX || 0,
        positionY: n.position?.y || n.positionY || 0,
      })),
    });
  }
  if (body.edges) {
    await prisma.workflowEdge.deleteMany({ where: { workflowId: id } });
    await prisma.workflowEdge.createMany({
      data: body.edges.map((e: any) => ({
        id: e.id, workflowId: id,
        sourceNodeId: e.source || e.sourceNodeId,
        targetNodeId: e.target || e.targetNodeId,
        label: e.label || e.sourceHandle || null,
      })),
    });
  }

  const workflow = await prisma.workflow.findFirst({ where: { id }, include: { nodes: true, edges: true } });
  return NextResponse.json(workflow);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await requireOrg(session);
  const { id } = await params;

  await prisma.workflowEdge.deleteMany({ where: { workflowId: id } });
  await prisma.workflowNode.deleteMany({ where: { workflowId: id } });
  const { count } = await prisma.workflow.deleteMany({ where: { id, organizationId: orgId } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
