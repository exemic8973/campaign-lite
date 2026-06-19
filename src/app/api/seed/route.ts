import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedAll } from "@/lib/seed-all";
import { getOrgId } from "@/lib/session-utils";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const results = await seedAll(orgId);
  return NextResponse.json({ ok: true, results: Object.keys(results) });
}
