import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";
import { figmaFrameToEmail, generateDummyFigmaData, injectImages } from "@/lib/figma-to-email";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();

  let figmaData: any;
  let templateName: string = "Imported from Figma";
  let imageMap: Record<string, string> = {};

  if (body.demo) {
    figmaData = generateDummyFigmaData();
    templateName = body.name || "Figma Newsletter (demo)";
  } else if (body.fileKey) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const token = body.figmaToken || org?.figmaToken || process.env.FIGMA_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ error: "Figma token not configured. Go to Settings to add it." }, { status: 400 });

    let apiUrl: string;
    if (body.frameId && body.templateIndex == null) {
      apiUrl = `https://api.figma.com/v1/files/${body.fileKey}/nodes?ids=${body.frameId}`;
    } else {
      apiUrl = `https://api.figma.com/v1/files/${body.fileKey}`;
    }

    // Add delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));

    let res = await fetch(apiUrl, { headers: { "X-Figma-Token": token } });

    // Retry once on rate limit
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 3000));
      res = await fetch(apiUrl, { headers: { "X-Figma-Token": token } });
    }

    if (!res.ok) {
      const detail = await res.text();
      let msg = detail;
      try { const j = JSON.parse(detail); msg = j.err || j.message || detail; } catch {}
      if (res.status === 429) msg = "Figma API rate limit exceeded. Please wait 30s and retry.";
      else if (msg.includes("Invalid token")) msg = "Invalid Figma token. Re-enter in Settings.";
      else if (res.status === 404) msg = "File not found.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const json = await res.json();

    // Resolve target node
    if (body.frameId && json.nodes?.[body.frameId]?.document) {
      figmaData = json.nodes[body.frameId].document;
    } else if (body.templateIndex != null) {
      const canvas = json.document?.children?.[0];
      const idx = body.templateIndex; // 0-indexed from client
      console.log(`Template index ${idx}, canvas has ${canvas?.children?.length} children`);
      if (canvas?.children?.[idx]) {
        figmaData = canvas.children[idx];
        console.log(`Selected: "${figmaData.name}" (type: ${figmaData.type})`);
        templateName = body.name || figmaData.name || `Template ${idx + 1}`;
      } else {
        return NextResponse.json({ error: `Template ${idx + 1} not found. File has ${canvas?.children?.length || 0} templates.` }, { status: 404 });
      }
    } else if (json.document) {
      figmaData = json.document;
    } else {
      return NextResponse.json({ error: "No document found" }, { status: 404 });
    }

    // Export images: find all IMAGE fills in the selected node tree
    const imageNodeIds: string[] = [];
    function findImageNodes(node: any): void {
      if (!node) return;
      if (node.fills?.some((f: any) => f.type === "IMAGE") && node.id) {
        imageNodeIds.push(node.id);
      }
      if (node.children) node.children.forEach((c: any) => findImageNodes(c));
    }
    findImageNodes(figmaData);

    if (imageNodeIds.length > 0) {
      console.log(`Exporting ${imageNodeIds.length} images...`);
      // Figma API: POST /v1/images/{fileKey} with ids param
      const imgRes = await fetch(
        `https://api.figma.com/v1/images/${body.fileKey}?ids=${imageNodeIds.join(",")}&format=png&scale=2`,
        { headers: { "X-Figma-Token": token } }
      );
      if (imgRes.ok) {
        const imgJson = await imgRes.json();
        imageMap = imgJson.images || {};
        console.log(`Got ${Object.keys(imageMap).length} image URLs`);
      } else {
        console.log("Image export failed:", await imgRes.text());
      }
    }
  } else {
    return NextResponse.json({ error: "Provide {demo:true} or {fileKey}." }, { status: 400 });
  }

  // Inject images into the HTML
  const html = injectImages(figmaFrameToEmail(figmaData), imageMap);

  // Extract subject
  const subject = body.subject || (() => {
    try { return figmaData.children?.[0]?.children?.[0]?.characters; } catch { return null; }
  })() || "Campaign from Figma";

  // Save template
  const template = await prisma.template.create({
    data: {
      name: templateName,
      description: body.demo ? "Auto-generated from Figma demo." : `Imported from Figma file ${body.fileKey}`,
      subject: subject.substring(0, 100),
      bodyHtml: html,
      variables: [],
      category: "marketing",
      organizationId: orgId,
    },
  });

  if (body.createCampaign) {
    await prisma.campaign.create({
      data: {
        name: `${templateName} Campaign`,
        type: "email",
        status: "draft",
        subject: subject.substring(0, 100),
        fromName: "Campaign Lite",
        fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@campaignlite.dev",
        trackOpens: true, trackClicks: true,
        templateId: template.id,
        organizationId: orgId,
      },
    });
  }

  return NextResponse.json({ ok: true, template: { id: template.id, name: template.name } });
}
