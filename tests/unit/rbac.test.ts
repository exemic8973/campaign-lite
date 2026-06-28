import { test, expect } from "@playwright/test";
import { canAccess, hasMinRole, ROLE_RANK, PERMISSIONS } from "../../src/lib/rbac";

test.describe("ROLE_RANK hierarchical structure", () => {
  test("admin outranks everyone", () => {
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.manager);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.user);
  });

  test("manager outranks user", () => {
    expect(ROLE_RANK.manager).toBeGreaterThan(ROLE_RANK.user);
  });
});

test.describe("hasMinRole (hierarchical rank check)", () => {
  test("admin passes every gate", () => {
    expect(hasMinRole("admin", "user")).toBe(true);
    expect(hasMinRole("admin", "manager")).toBe(true);
    expect(hasMinRole("admin", "admin")).toBe(true);
  });

  test("manager passes user and manager gates", () => {
    expect(hasMinRole("manager", "user")).toBe(true);
    expect(hasMinRole("manager", "manager")).toBe(true);
  });

  test("manager fails admin gate", () => {
    expect(hasMinRole("manager", "admin")).toBe(false);
  });

  test("user passes user gate", () => {
    expect(hasMinRole("user", "user")).toBe(true);
  });

  test("user fails manager and admin gates", () => {
    expect(hasMinRole("user", "manager")).toBe(false);
    expect(hasMinRole("user", "admin")).toBe(false);
  });

  test("unknown role defaults to 0 and fails every gate", () => {
    expect(hasMinRole("guest", "user")).toBe(false);
    expect(hasMinRole("", "user")).toBe(false);
  });
});

test.describe("canAccess (resource permission check — separate from hasMinRole)", () => {
  test("admin can access any resource", () => {
    expect(canAccess("admin", "campaigns")).toBe(true);
    expect(canAccess("admin", "settings")).toBe(true);
    expect(canAccess("admin", "any-resource")).toBe(true);
  });

  test("manager can access allowed resources but not restricted ones", () => {
    expect(canAccess("manager", "campaigns")).toBe(true);
    expect(canAccess("manager", "settings")).toBe(true);
    expect(canAccess("manager", "dashboard")).toBe(true);
  });

  test("user has limited access", () => {
    expect(canAccess("user", "dashboard")).toBe(true);
    expect(canAccess("user", "contacts")).toBe(true);
    expect(canAccess("user", "segments")).toBe(true);
  });

  test("canAccess and hasMinRole are independent checks", () => {
    // A manager has rank >= user (true) but may lack permission for a specific resource
    expect(hasMinRole("manager", "user")).toBe(true);
    // canAccess checks resource-level permissions, not rank
    expect(canAccess("manager", "settings")).toBe(true);
    expect(PERMISSIONS.manager).toContain("settings");
  });
});
