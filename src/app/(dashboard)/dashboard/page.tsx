import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Megaphone, MailOpen, MousePointerClick, FlaskConical } from "lucide-react";
import { seedAll } from "@/lib/seed-all";
import { getOrgId } from "@/lib/session-utils";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const orgId = await getOrgId(session);
  if (!orgId) redirect("/auth/login");

  // Auto-seed on first visit
  const contactCount = await prisma.contact.count({ where: { organizationId: orgId } });
  if (contactCount === 0) {
    await seedAll(orgId);
  }

  const [totalContacts, totalCampaigns, recentCampaigns] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.campaign.count({ where: { organizationId: orgId } }),
    prisma.campaign.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true, sentCount: true, openCount: true, createdAt: true },
    }),
  ]);

  const totalOpens = await prisma.campaignEvent.count();
  const totalClicks = await prisma.campaignEvent.count({ where: { type: "click" } });

  const stats = [
    { label: "Total Contacts", value: totalContacts.toLocaleString(), icon: Users, color: "text-blue-600 dark:text-blue-400" },
    { label: "Campaigns Sent", value: totalCampaigns.toLocaleString(), icon: Megaphone, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Total Opens", value: totalOpens.toLocaleString(), icon: MailOpen, color: "text-amber-600 dark:text-amber-400" },
    { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-violet-600 dark:text-violet-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {session.user.name || "there"}</p>
        </div>
        <form action="/api/seed" method="POST">
          <Button type="submit" variant="outline" size="sm" className="gap-1">
            <FlaskConical className="h-3 w-3" />
            Seed Demo Data
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
              <a href="/campaigns" className="text-sm font-medium text-primary hover:underline">Create your first campaign</a>
            </div>
          ) : (
            <div className="divide-y">
              {recentCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="flex items-center justify-between py-3">
                  <div>
                    <a href={`/campaigns/${campaign.id}`} className="font-medium hover:text-primary">{campaign.name}</a>
                    <p className="text-xs text-muted-foreground">{formatDate(campaign.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{campaign.sentCount} sent</span>
                    <Badge variant={campaign.status === "sent" ? "success" : campaign.status === "sending" ? "warning" : "secondary"}>{campaign.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
