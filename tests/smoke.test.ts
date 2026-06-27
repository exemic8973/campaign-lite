import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

async function login(page: any) {
  await page.goto("/auth/login");
  const email = `test-${Date.now()}@test.com`;
  await page.fill('input[type="email"]', email);
  await page.getByRole("button", { name: /sign in with email/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Campaign Lite - Smoke Tests", () => {

  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("body")).toContainText("Welcome to Campaign Lite");
  });

  test("can login and see dashboard", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");
    await expect(page.locator("body")).toContainText("Dashboard");
  });

  test("templates page renders", async ({ page }) => {
    await login(page);
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();
  });

  test("campaigns page renders", async ({ page }) => {
    await login(page);
    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: "Campaigns" })).toBeVisible();
  });

  test("contacts page renders", async ({ page }) => {
    await login(page);
    await page.goto("/contacts");
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
  });

  test("segments page renders", async ({ page }) => {
    await login(page);
    await page.goto("/segments");
    await expect(page.getByRole("heading", { name: "Segments" })).toBeVisible();
  });

  test("signup page loads and shows register form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.locator("body")).toContainText("Create Account");
    await expect(page.locator("body")).toContainText("Set up your organization");
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test("can create a campaign via API", async ({ page }) => {
    await login(page);
    const resp = await page.request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `E2E Test Campaign ${Date.now()}`,
        subject: "Test Subject",
        type: "email",
      },
    });
    expect(resp.status()).toBe(200);
    const campaign = await resp.json();
    expect(campaign.id).toBeTruthy();
    expect(campaign.name).toContain("E2E Test Campaign");
    expect(campaign.status).toBe("draft");
  });

  test("can create a contact via API", async ({ page }) => {
    await login(page);
    const email = `e2e-contact-${Date.now()}@test.com`;
    const resp = await page.request.post(`${BASE}/api/contacts`, {
      data: { email, firstName: "E2E", lastName: "Test", tags: ["e2e"] },
    });
    expect(resp.status()).toBe(200);
    const contact = await resp.json();
    expect(contact.id).toBeTruthy();
    expect(contact.email).toBe(email);
  });

  test("can create a template via API", async ({ page }) => {
    await login(page);
    const resp = await page.request.post(`${BASE}/api/templates`, {
      data: {
        name: `E2E Template ${Date.now()}`,
        bodyHtml: "<p>Hello {{name}}, welcome!</p>",
        category: "marketing",
      },
    });
    expect(resp.status()).toBe(200);
    const template = await resp.json();
    expect(template.id).toBeTruthy();
    expect(template.name).toContain("E2E Template");
    expect(template.variables).toContain("name");
  });

  test("creating a campaign with a template and segment", async ({ page }) => {
    await login(page);

    // Create template
    const tmplResp = await page.request.post(`${BASE}/api/templates`, {
      data: { name: `Templ-${Date.now()}`, bodyHtml: "<p>{{content}}</p>", category: "marketing" },
    });
    expect(tmplResp.status()).toBe(200);
    const template = await tmplResp.json();

    // Create segment
    const segResp = await page.request.post(`${BASE}/api/segments`, {
      data: { name: `Seg-${Date.now()}`, rules: { logic: "and", conditions: [] } },
    });
    expect(segResp.status()).toBe(200);
    const segment = await segResp.json();

    // Create campaign linked to template and segment
    const campResp = await page.request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `Full Campaign ${Date.now()}`,
        subject: "Full Test",
        templateId: template.id,
        segmentId: segment.id,
      },
    });
    expect(campResp.status()).toBe(200);
    const campaign = await campResp.json();
    expect(campaign.templateId).toBe(template.id);
    expect(campaign.segmentId).toBe(segment.id);
  });
});
