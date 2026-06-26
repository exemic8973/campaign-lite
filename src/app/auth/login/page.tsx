"use client";

import { useState } from "react";
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
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("dev", { email, redirect: false });
      if (result?.error) {
        setError(result.error);
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
          <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">dev</span></div></div>
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email (dev login)</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <LogIn className="h-5 w-5" />
              {loading ? "Signing in..." : "Sign in with email"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground">
            New to Campaign Lite? <Link href="/auth/signup" className="text-primary hover:underline">Create an account</Link>
          </p>
          <p className="text-xs text-center text-muted-foreground">
            Enter any email to create an account instantly. No password needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
