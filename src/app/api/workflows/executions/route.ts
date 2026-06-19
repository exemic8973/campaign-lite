import { NextResponse } from "next/server";
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
    select: { id: true },
  });

  const executions = await prisma.workflowExecution.findMany({
    where: { workflowId: { in: workflows.map((w) => w.id) } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      logs: {
        orderBy: { createdAt: "asc" },
        select: { id: true, nodeId: true, status: true, output: true, error: true },
      },
    },
  });

  return NextResponse.json(executions);
}
