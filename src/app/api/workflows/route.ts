import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const workflows = await prisma.workflow.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { nodes: true, executions: true } } },
    });
    return NextResponse.json(workflows);
  })(_req);
}

const workflowSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  triggerType: z.string().optional(),
  triggerConfig: z.any().optional().nullable(),
});

export async function POST(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof workflowSchema>;
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
  }, { schema: workflowSchema, minRole: "manager" })(request);
}
