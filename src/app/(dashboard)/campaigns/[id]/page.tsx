import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getOrgId } from "@/lib/session-utils";
import { CampaignDetail } from "./detail";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId },
    include: {
      template: { select: { id: true, name: true } },
      segment: { select: { id: true, name: true } },
    },
  });

  if (!campaign) notFound();

  // Serialize dates for client component
  const serialized = {
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    scheduledAt: campaign.scheduledAt?.toISOString() || null,
    sentAt: campaign.sentAt?.toISOString() || null,
  };

  return <CampaignDetail campaign={serialized} />;
}
