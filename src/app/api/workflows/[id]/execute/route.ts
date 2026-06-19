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

  try {
    const execution = await executeWorkflow(id);
    return NextResponse.json(execution);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
