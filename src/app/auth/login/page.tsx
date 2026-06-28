"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Chrome, LogIn } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDev, setIsDev] = useState(false);
  const searchParams = useSearchParams();

  // Handle errors passed via URL params
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "CredentialsSignin") setError("Invalid email or password");
    else if (err) setError(err);
  }, [searchParams]);

  useEffect(() => {
    setIsDev(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const provider = isDev ? "dev" : "login";

    // Submit without redirect: false so the browser naturally follows
    // the 302 redirect chain, committing the session cookie before
    // the request to '/' arrives. On error, NextAuth redirects to
    // this page with ?error=... which we catch in the useEffect above.
    if (isDev) {
      await signIn(provider, { email, callbackUrl: "/dashboard" });
    } else {
      await signIn(provider, { email, password, callbackUrl: "/dashboard" });
    }

    // signIn navigates away on success; if we reach here, it failed.
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Welcome to Campaign Lite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full gap-2" onClick={handleGoogleLogin}>
            <Chrome className="h-5 w-5" />
            Continue with Google
          </Button>
          <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div></div>
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            {!isDev && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                {(error.includes("No account") || error.includes("Sign up") || error.includes("registered")) && (
                  <div className="mt-1">
                    <Link href="/auth/signup" className="underline font-medium">Create an account</Link>
                  </div>
                )}
              </div>
            )}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <LogIn className="h-5 w-5" />
              {loading ? "Signing in..." : "Sign in with email"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground">
            New to Campaign Lite? <Link href="/auth/signup" className="text-primary hover:underline">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
