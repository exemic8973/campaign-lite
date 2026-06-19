import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/session-utils";
import { SegmentsClient } from "./segments-client";

export default async function SegmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  const segCount = await prisma.segment.count({ where: { organizationId: orgId } });
  if (segCount === 0) {
    const { seedAll } = await import("@/lib/seed-all");
    await seedAll(orgId);
  }

  const segments = await prisma.segment.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, contactCount: true, createdAt: true },
  });

  const serialized = segments.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Segments</h1>
        <p className="text-muted-foreground">
          Build audience segments with rules
        </p>
      </div>
      <SegmentsClient initialSegments={serialized} />
    </div>
  );
}
