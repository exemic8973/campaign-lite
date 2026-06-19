"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

export function SmtpSettings() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    fetch("/api/smtp-settings")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data.configured);
        setHost(data.host || "");
        setPort(String(data.port || 587));
        setUser(data.user || "");
        setPass(data.pass || "");
        setFromEmail(data.fromEmail || "");
        setFromName(data.fromName || "");
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/smtp-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: parseInt(port) || 587, user, pass, fromEmail, fromName }),
    });
    setSaving(false);
    if (res.ok) {
      setConfigured(!!host && !!user);
      setMessage("SMTP settings saved.");
    } else {
      setMessage("Failed to save.");
    }
  };

  const handleTest = async () => {
    setTestSending(true);
    setMessage("");
    // Save first, then send a test via API
    await handleSave();
    setTestSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {configured ? (
          <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> SMTP Connected</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1"><X className="h-3 w-3" /> SMTP Not configured</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="smtp-host">SMTP Host</Label>
          <Input id="smtp-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-port">Port</Label>
          <Input id="smtp-port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-user">Username</Label>
          <Input id="smtp-user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="you@gmail.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-pass">Password</Label>
          <Input id="smtp-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={configured ? "••••••••" : "App password"} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-from">From Email</Label>
          <Input id="smtp-from" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@yourdomain.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-from-name">From Name</Label>
          <Input id="smtp-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your Company" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">{saving ? "Saving..." : "Save"}</Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <p className="text-xs text-muted-foreground">
        For Gmail: use port 587, enable 2FA, and create an App Password at myaccount.google.com/apppasswords
      </p>
    </div>
  );
}
