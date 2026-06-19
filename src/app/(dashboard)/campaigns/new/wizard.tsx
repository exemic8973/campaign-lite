"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { Megaphone, ChevronLeft, ChevronRight, Eye } from "lucide-react";

interface Template { id: string; name: string }
interface Segment { id: string; name: string; contactCount: number }

export function CampaignWizard({ templates, segments }: { templates: Template[]; segments: Segment[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templatePreview, setTemplatePreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [segmentId, setSegmentId] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);
  const [isAbTest, setIsAbTest] = useState(false);
  const [subjectB, setSubjectB] = useState("");
  const [splitPercent, setSplitPercent] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    setSubmitting(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateId: templateId || undefined,
        segmentId: segmentId || undefined,
        subject,
        subjectB: isAbTest ? subjectB : undefined,
        isAbTest,
        splitPercent,
        fromName: fromName || undefined,
        fromEmail: fromEmail || undefined,
        trackOpens,
        trackClicks,
      }),
    });
    if (res.ok) {
      const campaign = await res.json();
      router.push(`/campaigns/${campaign.id}`);
    }
    setSubmitting(false);
  };

  const steps = [1, 2, 3];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
        <p className="text-muted-foreground">Set up your email campaign in 3 steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            {s < 3 && <div className={`h-px w-12 ${s < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Campaign Details"}
            {step === 2 && "Content & Audience"}
            {step === 3 && "Tracking & Review"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Name your campaign and set the basics"}
            {step === 2 && "Choose your template and target audience"}
            {step === 3 && "Configure tracking and review before creating"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. March Newsletter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Your March update is here"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Your Company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="newsletter@company.com"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Email Template</Label>
                <div className="flex gap-2">
                  <Select value={templateId} onValueChange={(val) => { setTemplateId(val); setTemplatePreview(""); }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 && <SelectItem value="" disabled>No templates available</SelectItem>}
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templateId && (
                    <Button variant="outline" size="sm" className="gap-1" disabled={previewLoading} onClick={async () => {
                      setPreviewLoading(true);
                      try { const r = await fetch(`/api/templates/${templateId}`); const d = await r.json(); setTemplatePreview(d.bodyHtml || ''); } catch {}
                      setPreviewLoading(false);
                    }}>
                      <Eye className="h-3 w-3" /> {previewLoading ? "..." : "Preview"}
                    </Button>
                  )}
                </div>
                {templatePreview && (
                  <div className="rounded-lg border overflow-hidden bg-white" style={{ height: 240 }}>
                    <div className="bg-muted px-3 py-1 text-xs text-muted-foreground">Template Preview</div>
                    <iframe srcDoc={templatePreview} className="w-full" style={{ height: 210 }} title="Preview" sandbox="allow-same-origin" />
                  </div>
                )}
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Create a template first in the Templates section
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Target Segment</Label>
                <Select value={segmentId} onValueChange={setSegmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.contactCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave empty to send to all subscribed contacts
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {/* A/B Test */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">A/B Test</p>
                  <p className="text-xs text-muted-foreground">Test two subject lines</p>
                </div>
                <Switch checked={isAbTest} onCheckedChange={setIsAbTest} />
              </div>

              {isAbTest && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <Label>Subject A (control)</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line A" />
                  </div>
                  <div className="space-y-1">
                    <Label>Subject B (variant)</Label>
                    <Input value={subjectB} onChange={(e) => setSubjectB(e.target.value)} placeholder="Subject line B" />
                  </div>
                  <div className="space-y-1">
                    <Label>Split: A {splitPercent}% / B {100 - splitPercent}%</Label>
                    <input type="range" min="10" max="90" value={splitPercent} onChange={(e) => setSplitPercent(Number(e.target.value))} className="w-full" />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Track Opens</p>
                    <p className="text-xs text-muted-foreground">
                      Embed a tracking pixel to detect opens
                    </p>
                  </div>
                  <Switch checked={trackOpens} onCheckedChange={setTrackOpens} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Track Clicks</p>
                    <p className="text-xs text-muted-foreground">
                      Wrap links to track click-throughs
                    </p>
                  </div>
                  <Switch checked={trackClicks} onCheckedChange={setTrackClicks} />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Campaign:</span> {name || "(not set)"}</p>
                <p><span className="text-muted-foreground">Subject:</span> {subject || "(not set)"}</p>
                <p><span className="text-muted-foreground">Template:</span> {templateId ? templates.find((t) => t.id === templateId)?.name || "Selected" : "(none)"}</p>
                <p><span className="text-muted-foreground">Segment:</span> {segmentId ? segments.find((s) => s.id === segmentId)?.name || "Selected" : "All contacts"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} className="gap-2" disabled={step === 1 && !name}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={!name || submitting} className="gap-2">
            <Megaphone className="h-4 w-4" />
            {submitting ? "Creating..." : "Create Campaign"}
          </Button>
        )}
      </div>
    </div>
  );
}
