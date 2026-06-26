import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/workflow-engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { requireOrg } = await import("@/lib/session-utils");
  const orgId = await requireOrg(session);

  // Verify ownership before executing
  const existing = await prisma.workflow.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const execution = await executeWorkflow(id);
    return NextResponse.json(execution);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
