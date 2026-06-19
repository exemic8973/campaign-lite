import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  if (!body.fileKey) return NextResponse.json({ error: "Missing fileKey" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const token = org?.figmaToken || process.env.FIGMA_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "No Figma token" }, { status: 400 });

  // Fetch the full file to understand structure
  const res = await fetch(`https://api.figma.com/v1/files/${body.fileKey}`, {
    headers: { "X-Figma-Token": token },
  });
  if (!res.ok) return NextResponse.json({ error: "Figma API error", detail: await res.text() }, { status: 502 });

  const json = await res.json();

  // Extract just the structure: type names and text content
  function summarize(node: any, depth = 0): any {
    if (!node || depth > 6) return { type: node?.type, name: node?.name?.slice(0, 30) };
    const info: any = { type: node.type, name: node.name?.slice(0, 30) };
    if (node.characters) info.text = node.characters?.slice(0, 40);
    if (node.fills?.[0]?.color) info.fill = `rgb(${Math.round(node.fills[0].color.r*255)},${Math.round(node.fills[0].color.g*255)},${Math.round(node.fills[0].color.b*255)})`;
    if (node.children?.length) {
      info.children = node.children.slice(0, 20).map((c: any) => summarize(c, depth + 1));
    }
    return info;
  }

  const summary = summarize(json.document);

  // Also log the raw document structure to server console
  console.log("=== FIGMA FILE DEBUG ===");
  console.log("File:", json.name);
  console.log("Document type:", json.document?.type);
  console.log("Canvas children count:", json.document?.children?.[0]?.children?.length);

  function walkLog(node: any, depth: number, maxDepth = 5) {
    if (!node || depth > maxDepth) return;
    const txt = node.type === "TEXT" && node.characters ? ` "${node.characters.slice(0, 30)}"` : "";
    const fill = node.fills?.[0]?.color ? ` fill:rgb(${Math.round(node.fills[0].color.r*255)},${Math.round(node.fills[0].color.g*255)},${Math.round(node.fills[0].color.b*255)})` : "";
    console.log(`${"  ".repeat(depth)}${node.type} "${(node.name||"").slice(0,25)}"${txt}${fill} ${node.children?.length ? `[${node.children.length} children]` : ""}`);
    if (node.children && depth < maxDepth) {
      node.children.forEach((c: any) => walkLog(c, depth + 1, maxDepth));
    }
  }

  // Log the canvas children structure (first 5 levels deep)
  const canvas = json.document?.children?.[0];
  if (canvas) {
    console.log("--- Canvas children (up to 5 levels) ---");
    canvas.children.forEach((c: any) => walkLog(c, 0, 5));
    console.log("--- End canvas tree ---");
  }
  console.log("=== END FIGMA DEBUG ===");

  return NextResponse.json({ fileKey: body.fileKey, name: json.name, summary });
}
