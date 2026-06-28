export type UserRole = "admin" | "manager" | "user";

export const PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  manager: ["dashboard", "campaigns", "contacts", "segments", "templates", "workflows", "settings"],
  user: ["dashboard", "contacts", "segments"],
};

export function canAccess(role: string, resource: string): boolean {
  const perms = PERMISSIONS[role] || PERMISSIONS.user;
  return perms.includes("*") || perms.includes(resource);
}

/**
 * Numeric role rank for hierarchy comparison: user < manager < admin.
 * Used by withOrg to enforce minimum-role gates on API routes.
 */
export const ROLE_RANK: Record<UserRole, number> = { user: 1, manager: 2, admin: 3 };

/**
 * Returns true if `role` is at or above `min` in the hierarchy.
 * e.g. hasMinRole("manager", "user") → true, hasMinRole("user", "manager") → false.
 */
export function hasMinRole(role: string, min: UserRole): boolean {
  return (ROLE_RANK[role as UserRole] ?? 0) >= ROLE_RANK[min];
}
