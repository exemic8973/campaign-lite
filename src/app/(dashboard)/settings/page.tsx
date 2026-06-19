import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Mail, Key, Paintbrush } from "lucide-react";
import { FigmaSettings } from "./figma-settings";
import { SmtpSettings } from "./smtp-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  let user;
  if (session.user.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });
  } else if (session.user.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Organization</CardTitle>
          </div>
          <CardDescription>Your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={user?.organization?.name || session.user.name || ""} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input value={user?.organization?.slug || ""} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Figma Integration</CardTitle>
          </div>
          <CardDescription>
            Connect Figma to import designs as email templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FigmaSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">SMTP Settings</CardTitle>
          </div>
          <CardDescription>Connect your own email server (or use Resend via .env)</CardDescription>
        </CardHeader>
        <CardContent>
          <SmtpSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Resend (fallback)</CardTitle>
          </div>
          <CardDescription>Configure your sending domain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>From Email</Label>
            <Input value={process.env.RESEND_FROM_EMAIL || "not configured"} readOnly />
          </div>
          <div className="space-y-1">
            <Label>API Key</Label>
            <Input type="password" value={process.env.RESEND_API_KEY ? "••••••••" : "not configured"} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Account</CardTitle>
          </div>
          <CardDescription>Your user account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user?.email || session.user.email || ""} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={user?.name || session.user.name || "Not set"} readOnly />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Input value={user?.role || "admin"} readOnly />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
