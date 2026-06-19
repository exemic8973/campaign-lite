import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone } from "lucide-react";
import { getOrgId } from "@/lib/session-utils";

type CampaignItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: Date;
  sentAt: Date | null;
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusVariants: Record<string, "secondary" | "success" | "warning" | "destructive" | "default"> = {
  draft: "secondary",
  scheduled: "warning",
  sending: "warning",
  sent: "success",
  cancelled: "destructive",
};

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  // Auto-seed if empty
  const campaignCount = await prisma.campaign.count({ where: { organizationId: orgId } });
  if (campaignCount === 0) {
    const { seedAll } = await import("@/lib/seed-all");
    await seedAll(orgId);
  }

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      openCount: true,
      clickCount: true,
      createdAt: true,
      sentAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and send email campaigns
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Megaphone className="h-16 w-16 text-muted-foreground/30" />
          <div>
            <p className="text-sm text-muted-foreground">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first campaign to start reaching your audience
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: CampaignItem) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="transition-colors hover:border-primary/30 cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{campaign.name}</span>
                      <Badge variant={statusVariants[campaign.status] || "secondary"}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(campaign.createdAt)}
                      {campaign.sentAt && ` | Sent ${formatDate(campaign.sentAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-mono font-medium">{campaign.sentCount}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono font-medium">
                        {campaign.sentCount > 0
                          ? Math.round((campaign.openCount / campaign.sentCount) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Opens</p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono font-medium">
                        {campaign.sentCount > 0
                          ? Math.round((campaign.clickCount / campaign.sentCount) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
