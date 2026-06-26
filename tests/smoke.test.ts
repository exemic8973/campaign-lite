import { test, expect } from "@playwright/test";

async function login(page: any) {
  await page.goto("/auth/login");
  const email = `test-${Date.now()}@test.com`;
  await page.fill('input[type="email"]', email);
  await page.getByRole("button", { name: /sign in with email/i }).click();
  await page.waitForTimeout(3000);
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

});
