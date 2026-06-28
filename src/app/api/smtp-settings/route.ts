import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpFromName: true },
    });
    const configured = !!(org?.smtpHost && org?.smtpUser);
    const host = org?.smtpHost || process.env.SMTP_HOST || "";
    const port = org?.smtpPort || parseInt(process.env.SMTP_PORT || "587");
    const user = org?.smtpUser || process.env.SMTP_USER || "";
    const fromEmail = org?.smtpFromEmail || process.env.SMTP_FROM_EMAIL || "";
    const fromName = org?.smtpFromName || process.env.SMTP_FROM_NAME || "";
    return NextResponse.json({ configured, envFallback: !configured && !!process.env.SMTP_HOST, host, port, user, pass: org?.smtpPass ? "••••••••" : "", fromEmail, fromName });
  })(_req);
}

const smtpSchema = z.object({
  host: z.string().optional().nullable(),
  port: z.number().optional().nullable(),
  user: z.string().optional().nullable(),
  pass: z.string().optional().nullable(),
  fromEmail: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof smtpSchema>;
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
  }, { schema: smtpSchema, minRole: "manager" })(request);
}
