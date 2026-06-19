import nodemailer from "nodemailer";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

interface SendCampaignOptions {
  to: string[];
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  campaignId: string;
  trackingPixel?: string;
}

// Cached SMTP config (loaded once per send)
let smtpConfig: { host: string; port: number; user: string; pass: string } | null = null;

export async function loadSmtpConfig(orgId: string) {
  const { prisma } = await import("./db");
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpFromName: true },
  });
  if (org?.smtpHost && org?.smtpUser) {
    smtpConfig = {
      host: org.smtpHost,
      port: org.smtpPort || 587,
      user: org.smtpUser,
      pass: org.smtpPass || "",
    };
    return { fromEmail: org.smtpFromEmail, fromName: org.smtpFromName };
  }
  smtpConfig = null;
  return null;
}

export async function sendCampaignEmail({
  to,
  subject,
  html,
  fromName = "Campaign Lite",
  fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@campaignlite.dev",
  replyTo,
  campaignId,
  trackingPixel,
}: SendCampaignOptions) {
  let finalHtml = html;
  if (trackingPixel) {
    finalHtml = html.replace("</body>", `<img src="${trackingPixel}" width="1" height="1" alt="" style="display:none;" /></body>`);
  }

  // Try SMTP first
  if (smtpConfig) {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    });
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: to.join(","),
      subject,
      html: finalHtml,
      replyTo: replyTo || fromEmail,
    });
    return { id: `smtp_${Date.now()}` };
  }

  // Fall back to Resend
  if (process.env.RESEND_API_KEY) {
    const { data, error } = await getResend().emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html: finalHtml,
      replyTo: replyTo || fromEmail,
      headers: { "X-Campaign-Id": campaignId },
    });
    if (error) throw new Error(error.message);
    return data;
  }

  // Dev mode: simulate
  console.log(`[DEV] Simulated send to ${to}: ${subject}`);
  return { id: `sim_${Date.now()}` };
}

export function replaceVariables(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return result;
}
