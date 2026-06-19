import { prisma } from "./db";
import * as fs from "fs";
import * as path from "path";

const TEMPLATES_DIR = path.join(process.cwd(), "prisma", "email-templates", "templates", "inlined");

interface MailgunTemplate {
  name: string;
  subject: string;
  bodyHtml: string;
  description: string;
}

export async function seedMailgunTemplates(organizationId: string) {
  const files = [
    { file: "action.html", name: "Action Email (Mailgun)", subject: "Action Required", desc: "Transactional email with CTA button" },
    { file: "alert.html", name: "Email Alert (Mailgun)", subject: "Alert Notification", desc: "System alert notification template" },
    { file: "billing.html", name: "Billing Receipt (Mailgun)", subject: "Your Receipt", desc: "Billing and invoice template" },
  ];

  const created: string[] = [];

  for (const f of files) {
    const existing = await prisma.template.findFirst({ where: { organizationId, name: f.name } });
    if (existing) continue;

    const filePath = path.join(TEMPLATES_DIR, f.file);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      continue;
    }

    const bodyHtml = fs.readFileSync(filePath, "utf-8");

    await prisma.template.create({
      data: {
        name: f.name,
        description: f.desc,
        subject: f.subject,
        bodyHtml,
        variables: JSON.stringify(["firstName", "unsubscribeUrl"]),
        category: "transactional",
        organizationId,
      },
    });
    created.push(f.name);
  }

  return created;
}
