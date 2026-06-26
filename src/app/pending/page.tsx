import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function PendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const user = session.user.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;

  if (user?.approved) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm max-w-md w-full">
        <div className="flex flex-col space-y-1.5 p-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Waiting for Approval</h2>
        </div>
        <div className="p-6 pt-0 space-y-4 text-center">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 h-16 w-16 mx-auto flex items-center justify-center">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-muted-foreground">
            Your account <strong>{session.user.email}</strong> has been created but needs administrator approval.
          </p>
          <p className="text-sm text-muted-foreground">
            The administrator has been notified. You'll receive access once approved.
          </p>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground underline">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
