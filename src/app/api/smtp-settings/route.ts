import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";
import { encrypt, decrypt } from "@/lib/encryption";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpFromName: true },
  });

  const configured = !!(org?.smtpHost && org?.smtpUser);

  // Show env var fallback when no per-org SMTP is configured
  const host = org?.smtpHost || process.env.SMTP_HOST || "";
  const port = org?.smtpPort || parseInt(process.env.SMTP_PORT || "587");
  const user = org?.smtpUser || process.env.SMTP_USER || "";
  const fromEmail = org?.smtpFromEmail || process.env.SMTP_FROM_EMAIL || "";
  const fromName = org?.smtpFromName || process.env.SMTP_FROM_NAME || "";

  return NextResponse.json({
    configured,
    envFallback: !configured && !!process.env.SMTP_HOST,
    host,
    port,
    user,
    pass: org?.smtpPass ? "••••••••" : "",
    fromEmail,
    fromName,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();

  // Only update password if a new one is provided (not the masked "••••••••")
  const data: any = {
    smtpHost: body.host || null,
    smtpPort: body.port || null,
    smtpUser: body.user || null,
    smtpFromEmail: body.fromEmail || null,
    smtpFromName: body.fromName || null,
  };
  if (body.pass && body.pass !== "••••••••") {
    data.smtpPass = encrypt(body.pass);
  }

  await prisma.organization.update({ where: { id: orgId }, data });

  return NextResponse.json({ ok: true });
}
