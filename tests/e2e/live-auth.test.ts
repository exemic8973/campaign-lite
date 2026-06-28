import { test, expect } from "@playwright/test";

const BASE = "https://digitalcampaign.vercel.app";

test.describe("Live signup + login flow (production)", () => {
  const ts = Date.now();
  const email = `playwright-${ts}@test.com`;
  const password = "MyTestPass123!";

  test("signup creates account and redirects to dashboard", async ({ page }) => {
    await page.goto(`${BASE}/auth/signup`);
    await expect(page.locator("body")).toContainText("Create Account");

    await page.fill("#name", "Playwright Tester");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.fill("#orgName", "Playwright Org");

    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("Dashboard");
  });

  test("login with created account works", async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await expect(page.locator("body")).toContainText("Welcome to Campaign Lite");

    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.getByRole("button", { name: /sign in with email/i }).click();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("Dashboard");
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);

    await page.fill("#email", email);
    await page.fill("#password", "WrongPassword123!");
    await page.getByRole("button", { name: /sign in with email/i }).click();

    // Should show error message
    await expect(page.locator("text=Incorrect password").first()).toBeVisible({ timeout: 10000 });
  });

  test("login with unregistered email shows error", async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);

    await page.fill("#email", "nonexistent-99999@test.com");
    await page.fill("#password", "SomePass123!");
    await page.getByRole("button", { name: /sign in with email/i }).click();

    // Should show error message with signup link
    await expect(page.locator("text=No account registered").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Create an account").first()).toBeVisible();
  });
});
