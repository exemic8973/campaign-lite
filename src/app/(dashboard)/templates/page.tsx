import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/session-utils";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  // Auto-seed if empty
  const count = await prisma.template.count({ where: { organizationId: orgId } });
  if (count === 0) {
    const { seedAll } = await import("@/lib/seed-all");
    await seedAll(orgId);
  }

  const templates = await prisma.template.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      subject: true,
      category: true,
      variables: true,
      createdAt: true,
    },
  });

  const serialized = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground">
          Email templates with personalization variables
        </p>
      </div>
      <TemplatesClient initialTemplates={serialized} />
    </div>
  );
}
