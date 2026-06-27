import nodemailer from "nodemailer";
import { Resend } from "resend";
import { decrypt } from "./encryption";
import Handlebars from "handlebars";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

interface SmtpConfig { host: string; port: number; user: string; pass: string; fromEmail?: string | null; fromName?: string | null; }

interface SendCampaignOptions {
  to: string[];
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  campaignId: string;
  trackingPixel?: string;
  smtp?: SmtpConfig | null;
}

/**
 * Load SMTP config for a specific organization.
 * Returns null if no SMTP is configured. No module-level state.
 */
export async function loadSmtpConfig(orgId: string): Promise<SmtpConfig | null> {
  const { prisma } = await import("./db");
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFromEmail: true, smtpFromName: true },
  });
  if (org?.smtpHost && org?.smtpUser) {
    return {
      host: org.smtpHost,
      port: org.smtpPort || 587,
      user: org.smtpUser,
      pass: org.smtpPass ? (decrypt(org.smtpPass) || org.smtpPass) : "",
      fromEmail: org.smtpFromEmail,
      fromName: org.smtpFromName,
    };
  }

  // Fallback to global env vars if no per-org SMTP is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || "",
      fromEmail: process.env.SMTP_FROM_EMAIL,
      fromName: process.env.SMTP_FROM_NAME,
    };
  }

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
  smtp,
}: SendCampaignOptions) {
  let finalHtml = html;
  if (trackingPixel) {
    finalHtml = html.replace("</body>", `<img src="${trackingPixel}" width="1" height="1" alt="" style="display:none;" /></body>`);
  }

  // SMTP: build a fresh transporter per send
  if (smtp) {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: `"${smtp.fromName || fromName}" <${smtp.fromEmail || fromEmail}>`,
      to: to.join(","),
      subject,
      html: finalHtml,
      replyTo: replyTo || smtp.fromEmail || fromEmail,
    });
    return { id: `smtp_${Date.now()}` };
  }

  // Resend fallback
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

/**
 * Render a Handlebars template with HTML-escaping.
 * Falls back to simple regex replacement if Handlebars fails.
 */
export function replaceVariables(html: string, variables: Record<string, string>): string {
  try {
    const template = Handlebars.compile(html, { noEscape: false });
    return template(variables);
  } catch {
    // Fallback: simple regex replacement if template is malformed
    let result = html;
    for (const [key, value] of Object.entries(variables)) {
      // Escape HTML entities in the value
      const escaped = String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), escaped);
    }
    return result;
  }
}
