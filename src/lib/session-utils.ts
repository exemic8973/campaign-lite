import { auth } from "./auth";
import { prisma } from "./db";

export async function getOrgId(session?: any): Promise<string | null> {
  if (!session?.user) return null;
  const email = session.user.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.organizationId || null;
}

export async function getUserId(session?: any): Promise<string | null> {
  if (!session?.user) return null;
  const email = session.user.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.id || null;
}

export async function requireOrg(session?: any): Promise<string> {
  const orgId = await getOrgId(session);
  if (!orgId) throw new Error("Organization not found");
  return orgId;
}
