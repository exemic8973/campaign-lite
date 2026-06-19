import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/session-utils";
import { CampaignWizard } from "./wizard";

export default async function NewCampaignPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  const [templates, segments] = await Promise.all([
    prisma.template.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    }),
    prisma.segment.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, contactCount: true },
    }),
  ]);

  return <CampaignWizard templates={templates} segments={segments} />;
}
