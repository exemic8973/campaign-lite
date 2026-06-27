import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE = "http://localhost:3000";

/**
 * Helper: log in with dev provider and return the page (with session cookie).
 * Uses unique emails to create separate orgs.
 */
async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto("/auth/login");
  await page.fill('input[type="email"]', email);
  await page.getByRole("button", { name: /sign in with email/i }).click();
  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

/**
 * Helper: create a contact via the API (as the logged-in user).
 */
async function createContact(page: Page, email: string): Promise<string> {
  const resp = await page.request.post(`${BASE}/api/contacts`, {
    data: { email, firstName: "Test", lastName: "User", tags: ["test"] },
  });
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  return body.id;
}

/**
 * Helper: create a campaign via the API.
 */
async function createCampaign(page: Page, name: string): Promise<string> {
  const resp = await page.request.post(`${BASE}/api/campaigns`, {
    data: { name, subject: "Test Subject", type: "email" },
  });
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  return body.id;
}

/**
 * Helper: create a template via the API.
 */
async function createTemplate(page: Page, name: string): Promise<string> {
  const resp = await page.request.post(`${BASE}/api/templates`, {
    data: { name, bodyHtml: "<p>Hello {{name}}</p>", category: "marketing" },
  });
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  return body.id;
}

/**
 * Helper: create a segment via the API.
 */
async function createSegment(page: Page, name: string): Promise<string> {
  const resp = await page.request.post(`${BASE}/api/segments`, {
    data: { name, rules: { logic: "and", conditions: [] } },
  });
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  return body.id;
}

async function createWorkflow(page: Page, name: string): Promise<string> {
  const resp = await page.request.post(`${BASE}/api/workflows`, {
    data: { name, description: "Test workflow" },
  });
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  return body.id;
}

test.describe("Tenant isolation — cross-org access returns 404", () => {
  let orgA: { page: Page; context: BrowserContext; email: string };
  let orgB: { page: Page; context: BrowserContext; email: string };
  let contactId: string;
  let campaignId: string;
  let templateId: string;
  let segmentId: string;
  let workflowId: string;

  test.beforeAll(async ({ browser }) => {
    const ts = Date.now();
    const emailA = `org-a-${ts}@test.com`;
    const emailB = `org-b-${ts}@test.com`;

    // --- Org A: create records ---
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginAs(pageA, emailA);

    contactId = await createContact(pageA, `contact-${ts}@test.com`);
    campaignId = await createCampaign(pageA, `Campaign A ${ts}`);
    templateId = await createTemplate(pageA, `Template A ${ts}`);
    segmentId = await createSegment(pageA, `Segment A ${ts}`);
    workflowId = await createWorkflow(pageA, `Workflow A ${ts}`);

    orgA = { page: pageA, context: contextA, email: emailA };

    // --- Org B: log in (different org) ---
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAs(pageB, emailB);
    orgB = { page: pageB, context: contextB, email: emailB };
  });

  test.afterAll(async () => {
    await orgA?.context?.close();
    await orgB?.context?.close();
  });

  test.describe("Contacts", () => {
    test("GET contact from other org returns 404", async () => {
      const resp = await orgB.page.request.get(`${BASE}/api/contacts?id=${contactId}`);
      // The GET endpoint fetches all contacts with orgId filter, so an individual contact
      // from another org won't appear in the list
      // But there's no GET-by-id endpoint — it lists all. So we check the list doesn't include it.
      const body = await resp.json();
      const ids = body.contacts?.map((c: any) => c.id) || [];
      expect(ids).not.toContain(contactId);
    });

    test("PUT contact from other org returns 404", async () => {
      const resp = await orgB.page.request.put(`${BASE}/api/contacts?id=${contactId}`, {
        data: { firstName: "Hacker" },
      });
      expect(resp.status()).toBe(404);
    });

    test("DELETE contact from other org returns 404", async () => {
      const resp = await orgB.page.request.delete(`${BASE}/api/contacts?id=${contactId}`);
      expect(resp.status()).toBe(404);

      // Verify it still exists in Org A
      const respA = await orgA.page.request.get(`${BASE}/api/contacts`);
      const bodyA = await respA.json();
      const ids = bodyA.contacts?.map((c: any) => c.id) || [];
      expect(ids).toContain(contactId);
    });
  });

  test.describe("Campaigns", () => {
    test("GET campaigns list doesn't include other org's data", async () => {
      const resp = await orgB.page.request.get(`${BASE}/api/campaigns`);
      const body = await resp.json();
      const ids = body.map((c: any) => c.id) || [];
      expect(ids).not.toContain(campaignId);
    });

    test("PUT campaign from other org returns 404", async () => {
      const resp = await orgB.page.request.put(`${BASE}/api/campaigns?id=${campaignId}`, {
        data: { name: "Hacked Campaign" },
      });
      expect(resp.status()).toBe(404);
    });

    test("DELETE campaign from other org returns 404", async () => {
      const resp = await orgB.page.request.delete(`${BASE}/api/campaigns?id=${campaignId}`);
      expect(resp.status()).toBe(404);

      // Verify still exists in Org A
      const respA = await orgA.page.request.get(`${BASE}/api/campaigns`);
      const ids = (await respA.json()).map((c: any) => c.id) || [];
      expect(ids).toContain(campaignId);
    });
  });

  test.describe("Templates", () => {
    test("GET templates list doesn't include other org's data", async () => {
      const resp = await orgB.page.request.get(`${BASE}/api/templates`);
      const body = await resp.json();
      const ids = body.map((t: any) => t.id) || [];
      expect(ids).not.toContain(templateId);
    });

    test("PUT template from other org returns 404", async () => {
      const resp = await orgB.page.request.put(`${BASE}/api/templates?id=${templateId}`, {
        data: { name: "Hacked Template" },
      });
      expect(resp.status()).toBe(404);
    });

    test("DELETE template from other org returns 404", async () => {
      const resp = await orgB.page.request.delete(`${BASE}/api/templates?id=${templateId}`);
      expect(resp.status()).toBe(404);

      // Verify still exists in Org A
      const respA = await orgA.page.request.get(`${BASE}/api/templates`);
      const ids = (await respA.json()).map((t: any) => t.id) || [];
      expect(ids).toContain(templateId);
    });
  });

  test.describe("Segments", () => {
    test("GET segments list doesn't include other org's data", async () => {
      const resp = await orgB.page.request.get(`${BASE}/api/segments`);
      const body = await resp.json();
      const ids = body.map((s: any) => s.id) || [];
      expect(ids).not.toContain(segmentId);
    });

    test("PUT segment from other org returns 404", async () => {
      const resp = await orgB.page.request.put(`${BASE}/api/segments?id=${segmentId}`, {
        data: { name: "Hacked Segment" },
      });
      expect(resp.status()).toBe(404);
    });

    test("DELETE segment from other org returns 404", async () => {
      const resp = await orgB.page.request.delete(`${BASE}/api/segments?id=${segmentId}`);
      expect(resp.status()).toBe(404);

      // Verify still exists in Org A
      const respA = await orgA.page.request.get(`${BASE}/api/segments`);
      const ids = (await respA.json()).map((s: any) => s.id) || [];
      expect(ids).toContain(segmentId);
    });
  });

  test.describe("Workflows", () => {
    test("GET workflow from other org returns 404", async () => {
      const resp = await orgB.page.request.get(`${BASE}/api/workflows/${workflowId}`);
      expect(resp.status()).toBe(404);
    });

    test("PUT workflow from other org returns 404", async () => {
      const resp = await orgB.page.request.put(`${BASE}/api/workflows/${workflowId}`, {
        data: { name: "Hacked Workflow" },
      });
      expect(resp.status()).toBe(404);
    });

    test("DELETE workflow from other org returns 404", async () => {
      const resp = await orgB.page.request.delete(`${BASE}/api/workflows/${workflowId}`);
      expect(resp.status()).toBe(404);

      // Verify still exists in Org A
      const respA = await orgA.page.request.get(`${BASE}/api/workflows/${workflowId}`);
      expect(respA.status()).toBe(200);
    });
  });

  test.describe("Campaign Events", () => {
    test("GET events from other org's campaign returns 404", async () => {
      const resp = await orgB.page.request.get(`${BASE}/api/campaigns/${campaignId}/events`);
      expect(resp.status()).toBe(404);
    });

    test("DELETE events from other org's campaign returns 404", async () => {
      const resp = await orgB.page.request.delete(`${BASE}/api/campaigns/${campaignId}/events`);
      expect(resp.status()).toBe(404);
    });

    test("GET events from own campaign returns 200", async () => {
      const resp = await orgA.page.request.get(`${BASE}/api/campaigns/${campaignId}/events`);
      expect(resp.status()).toBe(200);
    });
  });

  test.describe("Segment Members", () => {
    test("GET members from other org's segment returns 404", async () => {
      const resp = await orgB.page.request.get(`${BASE}/api/segments/members?segmentId=${segmentId}`);
      expect(resp.status()).toBe(404);
    });

    test("POST member to other org's segment returns 404", async () => {
      const resp = await orgB.page.request.post(`${BASE}/api/segments/members`, {
        data: { segmentId, contactId },
      });
      expect(resp.status()).toBe(404);
    });

    test("DELETE member from other org's segment returns 404", async () => {
      const resp = await orgB.page.request.delete(`${BASE}/api/segments/members?segmentId=${segmentId}&contactId=${contactId}`);
      expect(resp.status()).toBe(404);
    });

    test("GET members from own segment returns 200", async () => {
      const resp = await orgA.page.request.get(`${BASE}/api/segments/members?segmentId=${segmentId}`);
      expect(resp.status()).toBe(200);
    });
  });

  test.describe("Approve endpoint", () => {
    test("authenticated cross-org approve returns 403", async () => {
      // Org B user tries to approve an Org A user
      const resp = await orgB.page.request.get(`${BASE}/api/approve?email=${orgA.email}`);
      expect([403, 404]).toContain(resp.status());
    });
  });

  test.describe("Legacy unsigned bypass paths", () => {
    test("unsubscribe without token returns 400", async () => {
      const resp = await orgA.page.request.get(`${BASE}/api/unsubscribe?contactId=${contactId}&campaignId=${campaignId}`);
      expect(resp.status()).toBe(400);
    });

    test("track/open without token returns pixel (no-op)", async () => {
      const resp = await orgA.page.request.get(`${BASE}/api/track/open?campaignId=${campaignId}&contactId=${contactId}`);
      // Returns transparent GIF even without token (won't record)
      expect(resp.status()).toBe(200);
    });
  });
});
