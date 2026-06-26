import { prisma } from "./db";

export async function seedAll(organizationId: string) {
  const results: Record<string, any> = {};

  // ── Templates ──
  const existingTemplates = await prisma.template.findFirst({ where: { organizationId } });
  if (!existingTemplates) {
    const t1 = await prisma.template.create({
      data: {
        name: "Welcome Email",
        description: "Friendly welcome message for new subscribers",
        subject: "Welcome to {{firstName}} - we're glad you're here!",
        bodyHtml: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;">
<div style="width:48px;height:48px;background:#2563eb;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:20px;">CL</div>
<h1 style="font-size:28px;font-weight:700;margin:0 0 8px;">Welcome, {{firstName}}!</h1>
<p style="color:#666;font-size:16px;line-height:1.6;margin:0;">Thanks for joining our community. We're excited to have you on board.</p>
</div>
<div style="background:#f8f9fa;border-radius:12px;padding:24px;margin-bottom:24px;">
<h2 style="font-size:18px;margin:0 0 12px;">What's next?</h2>
<ul style="color:#444;line-height:1.8;padding-left:20px;margin:0;">
<li>Complete your profile</li>
<li>Explore our features</li>
<li>Connect with other members</li>
</ul>
</div>
<div style="text-align:center;margin-bottom:24px;">
<a href="{{unsubscribeUrl}}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:999px;font-weight:600;">Get Started</a>
</div>
<p style="text-align:center;color:#999;font-size:12px;">You're receiving this because you signed up. <a href="{{unsubscribeUrl}}" style="color:#999;">Unsubscribe</a></p>
</div></body></html>`,
        variables: ["firstName", "lastName", "email", "unsubscribeUrl"],
        category: "marketing",
        organizationId,
      },
    });
    results.template1 = t1;

    const t2 = await prisma.template.create({
      data: {
        name: "Monthly Newsletter",
        description: "Regular newsletter with updates and articles",
        subject: "Your monthly update - {{month}}",
        bodyHtml: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<h1 style="font-size:24px;font-weight:700;margin:0 0 8px;">Hey {{firstName}}, here's your update</h1>
<p style="color:#666;font-size:14px;margin:0 0 24px;">{{month}} edition</p>
<div style="background:#f0f7ff;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="font-size:18px;margin:0 0 8px;">Featured: What's new</h2>
<p style="color:#555;line-height:1.6;margin:0;">We've shipped some exciting updates this month. Check out the latest features and improvements.</p>
</div>
<div style="background:#f0fdf4;border-radius:12px;padding:24px;margin-bottom:16px;">
<h2 style="font-size:18px;margin:0 0 8px;">Tip of the Month</h2>
<p style="color:#555;line-height:1.6;margin:0;">Did you know you can automate your campaigns using Workflows? Try it today!</p>
</div>
<div style="text-align:center;margin:24px 0;">
<a href="{{unsubscribeUrl}}" style="color:#999;font-size:12px;">Unsubscribe</a>
</div>
</div></body></html>`,
        variables: ["firstName", "month", "unsubscribeUrl"],
        category: "marketing",
        organizationId,
      },
    });
    results.template2 = t2;
  }

  // Figma-designed template sample
  const existingFigma = await prisma.template.findFirst({ where: { organizationId, name: "Promo Announcement (Figma)" } });
  if (!existingFigma) {
    const { figmaFrameToEmail, generateDummyFigmaData } = await import("./figma-to-email");
    const figmaData = generateDummyFigmaData();
    const html = figmaFrameToEmail(figmaData);
    const t3 = await prisma.template.create({
      data: {
        name: "Promo Announcement (Figma)",
        description: "Designed in Figma and auto-converted to responsive email HTML",
        subject: "Your monthly update is here!",
        bodyHtml: html,
        variables: ["firstName", "unsubscribeUrl"],
        category: "marketing",
        organizationId,
      },
    });
    results.template3 = t3;
  }

  // ── Contacts ──
  const existingContacts = await prisma.contact.findFirst({ where: { organizationId } });
  if (!existingContacts) {
    const contacts = await prisma.contact.createMany({
      data: [
        { email: "sarah.chen@example.com", firstName: "Sarah", lastName: "Chen", phone: "+1 (415) 555-0101", tags: ["vip", "newsletter"], source: "import", organizationId },
        { email: "james.wilson@example.com", firstName: "James", lastName: "Wilson", phone: "+1 (212) 555-0202", tags: ["newsletter"], source: "import", organizationId },
        { email: "maria.garcia@example.com", firstName: "Maria", lastName: "Garcia", phone: "+34 91 555 0303", tags: ["vip", "premium"], source: "manual", organizationId },
        { email: "alex.kim@example.com", firstName: "Alex", lastName: "Kim", phone: "+82 2-555-0404", tags: ["trial", "newsletter"], source: "import", organizationId },
        { email: "emma.thompson@example.com", firstName: "Emma", lastName: "Thompson", phone: "+44 20 7555 0505", tags: ["premium"], source: "manual", organizationId },
        { email: "david.park@example.com", firstName: "David", lastName: "Park", phone: "+1 (312) 555-0606", tags: ["vip"], source: "import", organizationId },
        { email: "lisa.martinez@example.com", firstName: "Lisa", lastName: "Martinez", phone: "+52 55 5555 0707", tags: ["newsletter", "trial"], source: "import", organizationId, isSubscribed: false },
        { email: "tom.brown@example.com", firstName: "Tom", lastName: "Brown", phone: "+1 (617) 555-0808", tags: [], source: "manual", organizationId },
      ],
    });
    results.contactsImported = contacts.count;
  }

  // ── Segments ──
  const existingSegments = await prisma.segment.findFirst({ where: { organizationId } });
  if (!existingSegments) {
    const s1 = await prisma.segment.create({
      data: {
        name: "VIP Customers",
        description: "High-value customers with VIP tag",
        rules: JSON.stringify({ logic: "and", conditions: [{ field: "tags", operator: "has", value: "vip" }] }),
        contactCount: 3,
        organizationId,
      },
    });
    results.segment1 = s1;

    const s2 = await prisma.segment.create({
      data: {
        name: "Newsletter Subscribers",
        description: "Active subscribers to the newsletter",
        rules: JSON.stringify({ logic: "and", conditions: [{ field: "tags", operator: "has", value: "newsletter" }, { field: "isSubscribed", operator: "equals", value: "true" }] }),
        contactCount: 4,
        organizationId,
      },
    });
    results.segment2 = s2;
  }

  // ── Campaigns ──
  const existingCampaigns = await prisma.campaign.findFirst({ where: { organizationId } });
  if (!existingCampaigns) {
    const c1 = await prisma.campaign.create({
      data: {
        name: "March Newsletter",
        type: "email",
        status: "sent",
        subject: "Your March update is here!",
        fromName: "Campaign Lite",
        fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@campaignlite.dev",
        trackOpens: true,
        trackClicks: true,
        sentCount: 5,
        openCount: 3,
        clickCount: 1,
        totalRecipients: 5,
        sentAt: new Date("2026-03-15"),
        organizationId,
      },
    });
    results.campaign1 = c1;

    const c2 = await prisma.campaign.create({
      data: {
        name: "VIP Exclusive Offer",
        type: "email",
        status: "draft",
        subject: "Exclusive offer for our VIP members",
        fromName: "Campaign Lite",
        fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@campaignlite.dev",
        trackOpens: true,
        trackClicks: true,
        organizationId,
      },
    });
    results.campaign2 = c2;
  }

  return results;
}
