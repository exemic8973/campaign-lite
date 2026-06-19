"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FigmaDebugPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDebug = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    let fileKey = "";
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/");
      const fi = parts.indexOf("file");
      const pi = parts.indexOf("proto");
      const ki = fi >= 0 ? fi : pi >= 0 ? pi : -1;
      if (ki >= 0) fileKey = parts[ki + 1];
    } catch {}

    if (!fileKey) { setError("Could not parse file key"); setLoading(false); return; }

    const res = await fetch("/api/figma-debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey }),
    });
    const data = await res.json();
    if (res.ok) setResult(data);
    else setError(data.error + ": " + (data.detail || ""));
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold">Figma Structure Debug</h1>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste your Figma URL"
        />
        <Button onClick={handleDebug} disabled={loading}>{loading ? "Loading..." : "Debug"}</Button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {result && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{result.name}</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono overflow-auto max-h-[500px] whitespace-pre-wrap">
              {JSON.stringify(result.summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
