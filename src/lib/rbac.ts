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
