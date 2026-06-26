"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("signup", {
        name, email, password, orgName,
        redirect: false,
      });
      if (result?.error) {
        if (result.error.includes("Awaiting")) {
          router.push("/pending");
          return;
        }
        setError(result.error);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Registration failed");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Set up your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="My Company" required />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Already have an account? <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
