"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check, X } from "lucide-react";

export function FigmaSettings() {
  const [token, setToken] = useState("");
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/figma-token")
      .then((r) => r.json())
      .then((data) => setConfigured(data.configured))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/figma-token", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ figmaToken: token || null }),
    });
    setSaving(false);
    if (res.ok) {
      setConfigured(!!token);
      setMessage(token ? "Token saved! You can now import from Figma URLs." : "Token removed.");
      setToken("");
    } else {
      setMessage("Failed to save token.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {configured ? (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" /> Connected
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <X className="h-3 w-3" /> Not connected
          </Badge>
        )}
        <a
          href="https://www.figma.com/developers/api#access-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary underline inline-flex items-center gap-1"
        >
          Get your Figma token <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-2">
        <Label htmlFor="figma-token">Figma Personal Access Token</Label>
        <div className="flex gap-2">
          <Input
            id="figma-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={configured ? "•••••••• (replace)" : "figd_..."}
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <p className="text-xs text-muted-foreground">
          Go to Figma Settings → Account → Personal Access Tokens to generate one.
          The token is stored securely in your organization settings.
        </p>
      </div>
    </div>
  );
}
