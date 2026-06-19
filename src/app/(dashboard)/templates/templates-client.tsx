"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  FileText,
  Code,
  LayoutTemplate,
  Mail,
  Eye,
  List,
  LayoutGrid,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Template {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  category: string;
  variables: string;
  createdAt: string;
}

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <h1>Hello, {{firstName}}!</h1>
    <p>This is a campaign email from Campaign Lite.</p>
    <p>You can use variables like {{firstName}}, {{lastName}}, and {{email}}.</p>
    <a href="{{unsubscribeUrl}}" style="color:#666;font-size:12px;">Unsubscribe</a>
  </div>
</body>
</html>`;

function renderVars(variables: string) {
  try {
    const vars: string[] = JSON.parse(variables || '[]');
    return <>
      {vars.slice(0, 3).map((v) => <Badge key={v} variant="outline" className="font-mono text-[10px]">{'{{'}{v}{'}}'}</Badge>)}
      {vars.length > 3 && <span className="text-xs text-muted-foreground">+{vars.length - 3}</span>}
    </>;
  } catch { return null; }
}

export function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"code" | "preview">("preview");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_TEMPLATE);
  const [category, setCategory] = useState("marketing");

  const resetForm = () => {
    setName("");
    setDescription("");
    setSubject("");
    setBodyHtml(DEFAULT_TEMPLATE);
    setCategory("marketing");
    setEditingId(null);
  };

  const handleCreate = async () => {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, subject, bodyHtml, category }),
    });
    if (res.ok) {
      const template = await res.json();
      setTemplates([template, ...templates]);
      setOpen(false);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const res = await fetch(`/api/templates?id=${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, subject, bodyHtml, category }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTemplates(templates.map((t) => (t.id === editingId ? { ...t, ...updated } : t)));
      setEditOpen(false);
      resetForm();
    }
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setName(template.name);
    setDescription(template.description || "");
    setSubject(template.subject || "");
    setCategory(template.category);
    // Fetch full template with body
    fetch(`/api/templates/${template.id}`)
      .then((r) => r.json())
      .then((data) => {
        setBodyHtml(data.bodyHtml || DEFAULT_TEMPLATE);
        setEditOpen(true);
      });
  };

  const handlePreview = async (template: Template) => {
    setPreviewName(template.name);
    const res = await fetch(`/api/templates/${template.id}`);
    const data = await res.json();
    setPreviewHtml(data.bodyHtml || "<p>No content</p>");
    setPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const [figmaOpen, setFigmaOpen] = useState(false);
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [figmaResult, setFigmaResult] = useState("");
  const [figmaUrlOpen, setFigmaUrlOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaName, setFigmaName] = useState("");
  const [figmaCreateCampaign, setFigmaCreateCampaign] = useState(false);
  const [figmaUrlLoading, setFigmaUrlLoading] = useState(false);
  const [figmaTemplateIndex, setFigmaTemplateIndex] = useState("");
  const [figmaUrlError, setFigmaUrlError] = useState("");
  const [figmaUrlResult, setFigmaUrlResult] = useState("");
  const [templateList, setTemplateList] = useState<{index:number;name:string}[]>([]);
  const [listing, setListing] = useState(false);

  const handleListTemplates = async () => {
    let fileKey = "";
    try {
      const u = new URL(figmaUrl);
      const parts = u.pathname.split("/");
      for (const key of ["design","file","proto"]) {
        const idx = parts.indexOf(key);
        if (idx >= 0 && parts.length > idx + 1) { fileKey = parts[idx + 1]; break; }
      }
    } catch {}
    if (!fileKey) { setFigmaUrlError("Could not parse URL"); return; }
    setListing(true);
    setFigmaUrlError("");
    const res = await fetch("/api/figma-list", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ fileKey }),
    });
    const data = await res.json();
    setListing(false);
    if (res.ok) setTemplateList(data.templates || []);
    else setFigmaUrlError(data.error || "Failed to list templates");
  };

  const handleFigmaDemo = async () => {
    setFigmaLoading(true);
    setFigmaResult("");
    const res = await fetch("/api/templates/figma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo: true, name: "Figma Newsletter (demo)", createCampaign: true }),
    });
    const data = await res.json();
    setFigmaLoading(false);
    if (res.ok) {
      setFigmaResult(`Template "${data.template.name}" created! ID: ${data.template.id}`);
      // Refresh the list
      fetch("/api/templates").then(r => r.json()).then(setTemplates);
    } else {
      setFigmaResult(`Error: ${data.error || "Unknown"}`);
    }
  };

  const handleFigmaUrlImport = async () => {
    setFigmaUrlLoading(true);
    setFigmaUrlError("");
    setFigmaUrlResult("");

    // Parse Figma URL: /file/KEY, /proto/KEY, or /community/file/ID
    let fileKey = "";
    let frameId = "";
    let isCommunity = false;
    try {
      const url = new URL(figmaUrl);
      const parts = url.pathname.split("/");
      const communityIdx = parts.indexOf("community");
      const fileIdx = parts.indexOf("file");
      const protoIdx = parts.indexOf("proto");
      const designIdx = parts.indexOf("design");

      if (communityIdx >= 0 && fileIdx >= 0 && fileIdx > communityIdx) {
        fileKey = parts[fileIdx + 1] || "";
        isCommunity = true;
      } else if (designIdx >= 0 && parts.length > designIdx + 1) {
        fileKey = parts[designIdx + 1];
      } else if (fileIdx >= 0 && parts.length > fileIdx + 1) {
        fileKey = parts[fileIdx + 1];
      } else if (protoIdx >= 0 && parts.length > protoIdx + 1) {
        fileKey = parts[protoIdx + 1];
      }
      const nodeParam = url.searchParams.get("node-id");
      if (nodeParam) {
        // Figma URLs use hyphen (1-4829) but API expects colon (1:4829)
        frameId = nodeParam.replace(/-/g, ":");
      }
    } catch {
      setFigmaUrlError("Invalid URL. Paste a Figma file URL like figma.com/file/KEY/NAME?node-id=ID");
      setFigmaUrlLoading(false);
      return;
    }

    if (!fileKey) {
      setFigmaUrlError("Could not find file key. Supported URL formats:");
      setFigmaUrlError(prev => prev +
        "\n• figma.com/file/KEY/NAME?node-id=ID" +
        "\n• figma.com/proto/KEY/NAME?node-id=ID" +
        "\n• figma.com/community/file/ID");
      setFigmaUrlLoading(false);
      return;
    }
    if (!frameId && !isCommunity) {
      setFigmaUrlError("Missing frame ID. Open your design in Figma and copy the URL with ?node-id=...");
      setFigmaUrlLoading(false);
      return;
    }

    const res = await fetch("/api/templates/figma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileKey,
        frameId,
        isCommunity,
        templateIndex: figmaTemplateIndex ? parseInt(figmaTemplateIndex) - 1 : undefined,
        name: figmaName || `Figma Import (${fileKey.slice(0, 8)})`,
        createCampaign: figmaCreateCampaign,
      }),
    });
    const data = await res.json();
    setFigmaUrlLoading(false);
    if (res.ok) {
      setFigmaUrlResult(`Template "${data.template.name}" created!`);
      fetch("/api/templates").then(r => r.json()).then(setTemplates);
      setFigmaUrlOpen(false);
      setFigmaUrl("");
      setFigmaName("");
    } else {
      setFigmaUrlError(data.error || "Import failed");
    }
  };

  const insertBlock = (type: string) => {
    const blocks: Record<string, string> = {
      header: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#215CE5;padding:32px 40px;"><tr><td align="center"><h1 style="color:#fff;font-size:24px;margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">{{firstName}}</h1><p style="color:#D9E2FF;font-size:14px;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Welcome to our newsletter</p></td></tr></table>`,
      hero: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:40px;"><tr><td align="center"><h2 style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Your monthly update is here!</h2><p style="font-size:16px;color:#666;line-height:1.5;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">We've been busy building new features just for you.</p></td></tr></table>`,
      features: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8F9FA;padding:32px 40px;"><tr><td><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="background:#fff;border-radius:8px;padding:20px;margin-bottom:12px;display:block;"><h3 style="color:#215CE5;font-size:16px;font-weight:600;margin:0 0 4px;">Feature One</h3><p style="color:#666;font-size:14px;margin:0;">Description of your first feature.</p></td></tr><tr><td style="background:#fff;border-radius:8px;padding:20px;display:block;"><h3 style="color:#215CE5;font-size:16px;font-weight:600;margin:0 0 4px;">Feature Two</h3><p style="color:#666;font-size:14px;margin:0;">Description of your second feature.</p></td></tr></table></td></tr></table>`,
      cta: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#215CE5;padding:36px 40px;"><tr><td align="center"><h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 16px;">Ready to get started?</h2><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#fff;border-radius:24px;padding:12px 32px;text-align:center;"><a href="{{unsubscribeUrl}}" style="color:#215CE5;font-size:16px;font-weight:600;text-decoration:none;">Explore Features</a></td></tr></table></td></tr></table>`,
      footer: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0F0F0;padding:24px 40px;"><tr><td align="center"><p style="color:#999;font-size:12px;margin:0;">Sent with Campaign Lite &bull; <a href="{{unsubscribeUrl}}" style="color:#999;">Unsubscribe</a></p></td></tr></table>`,
    };
    const block = blocks[type];
    if (block) {
      // Insert at cursor position or append
      const insertPos = bodyHtml.lastIndexOf("</td></tr></table>");
      if (insertPos >= 0) {
        const before = bodyHtml.substring(0, insertPos);
        const after = bodyHtml.substring(insertPos);
        setBodyHtml(before + block + after);
      } else {
        // Append before closing body
        const bodyClose = bodyHtml.lastIndexOf("</body>");
        if (bodyClose >= 0) {
          setBodyHtml(bodyHtml.substring(0, bodyClose) + block + bodyHtml.substring(bodyClose));
        } else {
          setBodyHtml(bodyHtml + block);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Figma import section */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleFigmaDemo} disabled={figmaLoading}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1ABCFE"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 8.46h-4.588c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98z"/></svg>
          {figmaLoading ? "Importing..." : "Demo from Figma"}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setFigmaUrlOpen(true)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1ABCFE"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 8.46h-4.588c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98z"/></svg>
          Import from URL
        </Button>
        <Link href="/figma" className="text-xs text-muted-foreground hover:text-primary underline">
          View Figma source
        </Link>
        <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
          const res = await fetch("/api/templates/mailgun", { method: "POST" });
          const data = await res.json();
          if (res.ok) {
            setFigmaResult(`Imported ${data.imported?.length || 0} Mailgun templates`);
            fetch("/api/templates").then(r => r.json()).then(setTemplates);
          }
        }}>
          <Mail className="h-3 w-3" /> Mailgun Templates
        </Button>
        {figmaResult && <span className="text-xs text-muted-foreground">{figmaResult}</span>}
      </div>

      {/* Figma URL import dialog */}
      <Dialog open={figmaUrlOpen} onOpenChange={setFigmaUrlOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Figma URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Figma File URL</Label>
              <Input
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/file/ABC123/Name?node-id=123-456"
              />
              <p className="text-xs text-muted-foreground">
                Paste the full URL from your browser address bar when viewing a Figma frame.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Template Name (optional)</Label>
                <Input value={figmaName} onChange={(e) => setFigmaName(e.target.value)} placeholder="My Figma Email" />
              </div>
              <div className="space-y-2">
                <Label>Template # (optional)</Label>
                <Input type="number" min="1" max="50" value={figmaTemplateIndex} onChange={(e) => setFigmaTemplateIndex(e.target.value)} placeholder="e.g. 10" />
                <p className="text-xs text-muted-foreground">Pick one template from the file</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button type="button" variant="outline" size="sm" onClick={handleListTemplates} disabled={listing || !figmaUrl}>
                {listing ? "Loading..." : "List available templates"}
              </Button>
            </div>
            {templateList.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border text-xs">
                {templateList.map((t) => (
                  <div key={t.index} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-b last:border-0"
                    onClick={() => setFigmaTemplateIndex(String(t.index + 1))}>
                    <span className="font-mono text-muted-foreground w-6">#{t.index + 1}</span>
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={figmaCreateCampaign} onCheckedChange={setFigmaCreateCampaign} />
              <Label className="text-sm font-normal">Also create a campaign</Label>
            </div>
            {figmaUrlError && <p className="text-xs text-destructive">{figmaUrlError}</p>}
            {figmaUrlResult && <p className="text-xs text-emerald-600">{figmaUrlResult}</p>}
            <Button className="w-full" onClick={handleFigmaUrlImport} disabled={figmaUrlLoading || !figmaUrl}>
              {figmaUrlLoading ? "Importing..." : "Import from Figma"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tpl-subject">Default Subject</Label>
                <Input id="tpl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-category">Category</Label>
                <select
                  id="tpl-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="marketing">Marketing</option>
                  <option value="transactional">Transactional</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Input id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <Label>HTML Template</Label>
              </div>
              {/* Insert Block buttons */}
              <div className="flex gap-1 flex-wrap border-b pb-2">
                <button type="button" onClick={() => setPreviewMode("code")}
                  className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${previewMode === "code" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Code</button>
                <button type="button" onClick={() => setPreviewMode("preview")}
                  className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${previewMode === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>Preview</button>
                <span className="w-px bg-border mx-1" />
                <button type="button" onClick={() => insertBlock('header')} className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded">+ Header</button>
                <button type="button" onClick={() => insertBlock('hero')} className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded">+ Hero</button>
                <button type="button" onClick={() => insertBlock('features')} className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded">+ Features</button>
                <button type="button" onClick={() => insertBlock('cta')} className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded">+ CTA</button>
                <button type="button" onClick={() => insertBlock('footer')} className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded">+ Footer</button>
              </div>
              {previewMode === "code" ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Use {'{{variableName}}'} for personalization. Available: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}, {'{{unsubscribeUrl}}'}
                  </p>
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="min-h-[300px] w-full rounded-lg border border-input bg-background p-3 font-mono text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    spellCheck={false}
                  />
                </>
              ) : (
                <div className="rounded-lg border overflow-hidden bg-white">
                  <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                    <svg className="h-3 w-3 text-red-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
                    <svg className="h-3 w-3 text-amber-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
                    <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
                    <span className="ml-1">Email Preview</span>
                  </div>
                  <iframe srcDoc={bodyHtml} className="w-full min-h-[400px]" title="Email preview" sandbox="allow-same-origin" />
                </div>
              )}
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!name}>
              Create Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            {/* Code / Preview tabs */}
            <div className="flex gap-2 border-b pb-2">
              <button
                type="button"
                onClick={() => setPreviewMode("code")}
                className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${previewMode === "code" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("preview")}
                className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${previewMode === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Preview
              </button>
            </div>

            {previewMode === "code" ? (
              <div className="space-y-2">
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className="min-h-[350px] w-full rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden bg-white">
                <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                  <svg className="h-3 w-3 text-red-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
                  <svg className="h-3 w-3 text-amber-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
                  <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
                  <span className="ml-1">Email Preview</span>
                </div>
                <iframe
                  srcDoc={bodyHtml}
                  className="w-full min-h-[400px]"
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
            </div>
            <Button className="w-full" onClick={handleUpdate}>
              Save Changes
            </Button>
        </DialogContent>
      </Dialog>

      {/* View toggle */}
      {templates.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-3 w-3" /> Grid
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setViewMode("list")}>
            <List className="h-3 w-3" /> List
          </Button>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{previewName}</DialogTitle></DialogHeader>
          <div className="rounded-lg border overflow-hidden bg-white">
            <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
              <svg className="h-3 w-3 text-red-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
              <svg className="h-3 w-3 text-amber-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
              <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
              <span className="ml-1">Email Preview</span>
            </div>
            <iframe srcDoc={previewHtml} className="w-full min-h-[400px]" title="Preview" sandbox="allow-same-origin" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No templates yet</p>
          <p className="text-xs text-muted-foreground">
            Create a template to reuse across multiple campaigns
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => handleEdit(template)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handlePreview(template); }}>
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {template.description && <CardDescription>{template.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>
                  {renderVars(template.variables)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => handleEdit(template)}>
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{template.name}</p>
                  {template.description && <p className="text-xs text-muted-foreground truncate">{template.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handlePreview(template); }}>
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
