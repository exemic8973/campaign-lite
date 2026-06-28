"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Chrome, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDev, setIsDev] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we're in dev mode (dev provider exists)
    setIsDev(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // In dev mode, use passwordless login. In production, use password.
    const provider = isDev ? "dev" : "login";
    const params: any = { email, redirect: false };
    if (!isDev) params.password = password;

    try {
      const result = await signIn(provider, params);
      if (result?.error) {
        // Show the specific error from the authorize callback
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password");
        } else {
          setError(result.error);
        }
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Login failed");
    }
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
                {error.includes("Sign up") && (
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
