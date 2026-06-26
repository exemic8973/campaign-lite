"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  Layers,
  Megaphone,
  FileText,
  Settings,
  LogOut,
  Workflow,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { canAccess } from "@/lib/rbac";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, resource: "dashboard" },
  { href: "/contacts", label: "Contacts", icon: Users, resource: "contacts" },
  { href: "/segments", label: "Segments", icon: Layers, resource: "segments" },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, resource: "campaigns" },
  { href: "/templates", label: "Templates", icon: FileText, resource: "templates" },
  { href: "/workflows", label: "Workflows", icon: Workflow, resource: "workflows" },
  { href: "/settings", label: "Settings", icon: Settings, resource: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "user";

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          CL
        </div>
        <span className="font-semibold tracking-tight">Campaign Lite</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.filter(item => canAccess(role, item.resource)).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
