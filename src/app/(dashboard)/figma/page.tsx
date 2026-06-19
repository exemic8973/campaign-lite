"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

const figmaData = {
  name: "Email Newsletter",
  description: "600px wide email design with 5 sections: header, hero, feature cards, CTA, footer",
  colors: { primary: "#215CE5", text: "#1A1A1A", muted: "#666666", light: "#F8F9FA" },
  typography: { heading: "Inter Bold 28px", body: "Inter Regular 16px", small: "Inter 12px" },
  sections: [
    { name: "Header", height: 120, elements: ["Logo text", "Tagline line"] },
    { name: "Hero", height: 180, elements: ["Title heading", "Description paragraph"] },
    { name: "Features", height: 240, elements: ["2 feature cards with title + description"] },
    { name: "CTA", height: 150, elements: ["Section heading", "Rounded button"] },
    { name: "Footer", height: 80, elements: ["Small muted text with link"] },
  ],
};

export default function FigmaSourcePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link href="/templates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Templates
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Figma Email Design Source</h1>
        <p className="text-muted-foreground">
          This is the Figma design that generates the "Promo Announcement" email template.
          Open the JSON in Figma (File → Import) to edit the design.
        </p>
      </div>

      {/* Side-by-side: Figma design mock vs rendered email */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Figma Design Mock */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1ABCFE"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491z"/></svg>
                Figma Design
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <a href="/figma-email-template.json" download>
                  <Download className="h-3 w-3" /> JSON
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Figma-style visual mock */}
            <div className="mx-auto" style={{ width: 300, background: "#fff" }}>
              {/* Header */}
              <div style={{ background: "#215CE5", padding: "20px 16px", textAlign: "center" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Campaign Lite</div>
                <div style={{ color: "#D9E2FF", fontSize: 10 }}>Email marketing for freelancers</div>
              </div>
              {/* Hero */}
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#1A1A1A" }}>Your monthly update is here!</div>
                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>We've been busy building new features just for you.</div>
              </div>
              {/* Feature cards */}
              <div style={{ background: "#F8F9FA", padding: "16px" }}>
                <div style={{ background: "#fff", borderRadius: 6, padding: "10px 14px", marginBottom: 8, fontSize: 11 }}>
                  <div style={{ color: "#215CE5", fontWeight: 600, marginBottom: 2 }}>Workflow Automation</div>
                  <div style={{ color: "#666" }}>Build multi-step campaigns.</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 6, padding: "10px 14px", fontSize: 11 }}>
                  <div style={{ color: "#215CE5", fontWeight: 600, marginBottom: 2 }}>Rich Templates</div>
                  <div style={{ color: "#666" }}>Design beautiful emails.</div>
                </div>
              </div>
              {/* CTA */}
              <div style={{ background: "#215CE5", padding: "20px 16px", textAlign: "center" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Ready to get started?</div>
                <div style={{ background: "#fff", color: "#215CE5", borderRadius: 20, padding: "8px 24px", display: "inline-block", fontSize: 11, fontWeight: 600 }}>Explore Features</div>
              </div>
              {/* Footer */}
              <div style={{ background: "#F0F0F0", padding: "16px", textAlign: "center", fontSize: 9, color: "#999" }}>
                Sent with Campaign Lite | Unsubscribe
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Design Specs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Design Specs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Dimensions</p>
              <p className="font-mono text-xs">600px × 800px (standard email width)</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Color Palette</p>
              <div className="flex gap-3">
                {Object.entries(figmaData.colors).map(([name, hex]) => (
                  <div key={name} className="flex flex-col items-center gap-1">
                    <div className="h-6 w-6 rounded-full border" style={{ background: hex }} />
                    <span className="text-[10px] text-muted-foreground">{name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Typography</p>
              {Object.entries(figmaData.typography).map(([name, spec]) => (
                <p key={name} className="text-xs font-mono">{name}: {spec}</p>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Sections</p>
              {figmaData.sections.map((s) => (
                <div key={s.name} className="flex items-center gap-2 py-1 border-b border-dashed last:border-0">
                  <span className="text-xs font-medium w-16">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">{s.height}px</span>
                  <span className="text-[10px] text-muted-foreground truncate">{s.elements.join(", ")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to edit this design in Figma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Download the <a href="/figma-email-template.json" className="text-primary hover:underline">Figma JSON file</a></li>
            <li>Open Figma (desktop or web)</li>
            <li>Go to <strong>File → Import</strong> and select the downloaded JSON</li>
            <li>Edit colors, text, layout as needed</li>
            <li>Copy the frame ID and use our <strong>Import from Figma</strong> button on the Templates page</li>
          </ol>
          <div className="mt-4 rounded-lg bg-muted p-3">
            <p className="text-xs font-medium mb-1">Quick import (requires FIGMA_ACCESS_TOKEN):</p>
            <pre className="text-xs font-mono bg-background rounded p-2 overflow-x-auto">
{`curl -X POST /api/templates/figma \\`}
{`  -H "Content-Type: application/json" \\`}
{`  -d 'fileKey:YOUR_FILE_KEY,frameId:FRAME_ID,name:My Design,createCampaign:true'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
