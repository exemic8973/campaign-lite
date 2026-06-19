"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Send,
  MailOpen,
  MousePointerClick,
  AlertTriangle,
  Ban,
  Pencil,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  trackOpens: boolean;
  trackClicks: boolean;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  template: { id: string; name: string } | null;
  segment: { id: string; name: string } | null;
}

interface Event {
  id: string;
  type: string;
  recipientEmail: string | null;
  createdAt: string;
}

interface Stats {
  sent: number;
  open: number;
  click: number;
  bounce: number;
  unsubscribe: number;
}

const statusVariants: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  scheduled: "warning",
  sending: "warning",
  sent: "success",
  cancelled: "destructive",
};

export function CampaignDetail({ campaign: initial }: { campaign: Campaign }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initial);
  const [sending, setSending] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(campaign.name);
  const [editSubject, setEditSubject] = useState(campaign.subject || "");
  const [editTemplateId, setEditTemplateId] = useState(campaign.template?.id || "");
  const [editSegmentId, setEditSegmentId] = useState(campaign.segment?.id || "");
  const [templates, setTemplates] = useState<{id:string;name:string}[]>([]);
  const [segments, setSegments] = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    fetch("/api/templates").then(r=>r.json()).then(setTemplates).catch(()=>{});
    fetch("/api/segments").then(r=>r.json()).then(setSegments).catch(()=>{});
  }, []);

  const canSend = campaign.status === "draft";

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/events`);
      const data = await res.json();
      setEvents(data.events);
      setStats(data.stats);
    } catch {}
  }, [campaign.id]);

  useEffect(() => {
    if (campaign.status !== "draft") {
      fetchEvents();
    }
  }, [campaign.status, fetchEvents]);

  const handleResend = async () => {
    if (!confirm("Reset stats and resend this campaign?")) return;
    setSending(true);
    // Reset stats and status
    await fetch(`/api/campaigns?id=${campaign.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft", sentCount: 0, openCount: 0, clickCount: 0, bounceCount: 0, unsubscribeCount: 0, totalRecipients: 0 }),
    });
    // Delete old events via API
    try { await fetch(`/api/campaigns/${campaign.id}/events`, { method: "DELETE" }); } catch {}
    // Now send
    const res = await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
    const result = await res.json();
    if (res.ok) {
      setCampaign((prev) => ({ ...prev, status: "sent", sentCount: result.sent || 0 }));
      fetchEvents();
    }
    setSending(false);
  };

  const handleSend = async () => {
    if (!confirm("Send this campaign now?")) return;
    setSending(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        setCampaign((prev) => ({ ...prev, status: "sent", sentCount: result.sent }));
        fetchEvents();
      } else {
        alert(result.error || "Failed to send");
      }
    } catch {
      alert("Failed to send campaign");
    }
    setSending(false);
  };

  const openRate = campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0;
  const clickRate = campaign.sentCount > 0 ? Math.round((campaign.clickCount / campaign.sentCount) * 100) : 0;
  const bounceRate = campaign.sentCount > 0 ? Math.round((campaign.bounceCount / campaign.sentCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="gap-1 mb-2" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant={statusVariants[campaign.status] || "secondary"}>
              {campaign.status}
            </Badge>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          {canSend && (
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send Now"}
            </Button>
          )}
          {!canSend && campaign.status === "sent" && (
            <Button onClick={handleResend} disabled={sending} variant="outline" className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Resend"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold font-mono">{campaign.sentCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Opens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MailOpen className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold font-mono">{campaign.openCount}</span>
              <span className="text-xs text-muted-foreground">({openRate}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold font-mono">{campaign.clickCount}</span>
              <span className="text-xs text-muted-foreground">({clickRate}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Bounces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold font-mono">{campaign.bounceCount}</span>
              <span className="text-xs text-muted-foreground">({bounceRate}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Unsubscribes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-rose-500" />
              <span className="text-2xl font-bold font-mono">{campaign.unsubscribeCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Campaign Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Template</Label>
              <select value={editTemplateId} onChange={(e) => setEditTemplateId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">No template</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Segment</Label>
              <select value={editSegmentId} onChange={(e) => setEditSegmentId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">All contacts</option>
                {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={async () => {
              await fetch(`/api/campaigns?id=${campaign.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, subject: editSubject, templateId: editTemplateId || null, segmentId: editSegmentId || null }),
              });
              setCampaign((prev) => ({ ...prev, name: editName, subject: editSubject, template: templates.find(t => t.id === editTemplateId) || prev.template, segment: segments.find(s => s.id === editSegmentId) || prev.segment }));
              setEditOpen(false);
            }}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Subject:</span>{" "}
              {campaign.subject || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">From:</span>{" "}
              {campaign.fromName ? `${campaign.fromName} <${campaign.fromEmail || ""}>` : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Template:</span>{" "}
              {campaign.template?.name || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Segment:</span>{" "}
              {campaign.segment?.name || "All contacts"}
            </div>
            <div>
              <span className="text-muted-foreground">Tracking:</span>{" "}
              {campaign.trackOpens ? "Opens" : ""}{" "}
              {campaign.trackOpens && campaign.trackClicks ? "& " : ""}
              {campaign.trackClicks ? "Clicks" : ""}
              {!campaign.trackOpens && !campaign.trackClicks ? "Disabled" : ""}
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              {new Date(campaign.createdAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event log */}
      {campaign.status !== "draft" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No events recorded yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 50).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge
                          variant={
                            event.type === "sent"
                              ? "secondary"
                              : event.type === "open"
                              ? "success"
                              : event.type === "click"
                              ? "default"
                              : event.type === "bounce"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {event.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.recipientEmail || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
