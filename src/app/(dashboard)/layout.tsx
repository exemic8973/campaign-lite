import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // Check approval status
  if (session.user.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { approved: true },
    });
    if (user && !user.approved) {
      redirect("/pending");
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
