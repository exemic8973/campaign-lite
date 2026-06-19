import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedDemoWorkflow, seedDemoWorkflowWithCondition } from "@/lib/seed-workflows";
import { getOrgId } from "@/lib/session-utils";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const wf1 = await seedDemoWorkflow(orgId);
  const wf2 = await seedDemoWorkflowWithCondition(orgId);

  return NextResponse.json({ seeded: [wf1.name, wf2.name] });
}
