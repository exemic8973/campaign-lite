import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Workflow, Play } from "lucide-react";
import { seedDemoWorkflow, seedDemoWorkflowWithCondition } from "@/lib/seed-workflows";
import { getOrgId } from "@/lib/session-utils";
import { WorkflowListClient } from "./workflow-list-client";

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  let workflows = await prisma.workflow.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { nodes: true, executions: true } } },
  });

  // Auto-seed demo workflows on first visit
  if (workflows.length === 0) {
    await seedDemoWorkflow(orgId);
    await seedDemoWorkflowWithCondition(orgId);
    workflows = await prisma.workflow.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { nodes: true, executions: true } } },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Build automated multi-step campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action="/api/workflows/seed" method="POST">
            <Button type="submit" variant="outline" size="sm" className="gap-1">
              <Play className="h-3 w-3" />
              Seed Demos
            </Button>
          </form>
          <Link href="/workflows/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Workflow
            </Button>
          </Link>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Workflow className="h-16 w-16 text-muted-foreground/30" />
          <div>
            <p className="text-sm text-muted-foreground">No workflows yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create visual automation workflows with triggers, emails, delays, and conditions
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic workflow */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Demo Workflows</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((wf) => (
                <Link key={wf.id} href={`/workflows/${wf.id}`}>
                  <Card className="transition-colors hover:border-primary/30 cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{wf.name}</CardTitle>
                        <Badge variant={wf.status === "active" ? "success" : "secondary"}>
                          {wf.status}
                        </Badge>
                      </div>
                      {wf.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{wf.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{wf._count.nodes} steps</span>
                        <span>{wf._count.executions} runs</span>
                        <span className="capitalize">{wf.triggerType} trigger</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Execution history */}
          <WorkflowListClient />
        </div>
      )}
    </div>
  );
}
