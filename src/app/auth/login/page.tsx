import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from "lucide-react";
import { DevLoginForm } from "./dev-login-form";

export default async function LoginPage() {
  const session = await auth();

  // If there's a stale session cookie, clear it and let user re-login
  if (session?.user?.email) {
    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      redirect("/dashboard");
    }
    // User doesn't exist in DB → go to NextAuth signout which clears cookies
    redirect("/api/logout");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Brand visual */}
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-primary/5 via-primary/10 to-background p-12 lg:flex">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            CL
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">
            Send campaigns your clients will actually notice
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            No enterprise bloat. No learning curve. Just contacts, segments, and
            messages that land in inboxes, not spam folders.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Campaign Lite built for freelancers
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Choose your sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google login */}
            <form
              action={async () => {
                "use server";
                const { signIn } = await import("@/lib/auth");
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button type="submit" variant="outline" className="w-full gap-2">
                <Chrome className="h-5 w-5" />
                Continue with Google
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">dev</span>
              </div>
            </div>

            <DevLoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
