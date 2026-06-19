import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;
  const workflow = await prisma.workflow.findFirst({
    where: { id },
    select: { id: true },
  });

  if (!workflow) redirect("/workflows");

  return <WorkflowBuilder workflowId={id} />;
}
