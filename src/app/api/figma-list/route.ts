import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  if (!body.fileKey) return NextResponse.json({ error: "Missing fileKey" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const token = (org?.figmaToken ? (decrypt(org.figmaToken) || org.figmaToken) : null) || process.env.FIGMA_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "No Figma token" }, { status: 400 });

  await new Promise(r => setTimeout(r, 500));
  let res = await fetch(`https://api.figma.com/v1/files/${body.fileKey}`, {
    headers: { "X-Figma-Token": token },
  });
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 3000));
    res = await fetch(`https://api.figma.com/v1/files/${body.fileKey}`, {
      headers: { "X-Figma-Token": token },
    });
  }
  if (!res.ok) {
    const txt = await res.text();
    let msg = txt;
    try { const j = JSON.parse(txt); msg = j.err || j.message || txt; } catch {}
    return NextResponse.json({ error: `Figma API: ${msg}` }, { status: 502 });
  }

  const json = await res.json();
  const canvas = json.document?.children?.[0];
  const templates = (canvas?.children || []).map((child: any, i: number) => ({
    index: i,
    name: child.name || `Frame ${i}`,
    type: child.type,
    id: child.id,
  }));

  return NextResponse.json({ file: json.name, templates });
}
