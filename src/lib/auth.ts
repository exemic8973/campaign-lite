import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

async function sendApprovalNotification(newUserEmail: string, org: { id: string; name: string }) {
  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, role: "admin", approved: true },
  });
  if (!admin?.email) return;
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const { signLink } = await import("./link-signing");
  const token = signLink({ purpose: "approve", orgId: org.id, email: newUserEmail, exp: Math.floor(Date.now() / 1000) + 7 * 86400 });
  const approvalUrl = `${baseUrl}/api/approve?token=${encodeURIComponent(token)}`;
  try {
    const { sendCampaignEmail, loadSmtpConfig } = await import("./email");
    const smtp = await loadSmtpConfig(org.id);
    await sendCampaignEmail({
      to: [admin.email],
      subject: `[Campaign Lite] New user "${newUserEmail}" needs approval`,
      html: `<p>A new user <strong>${newUserEmail}</strong> has signed up for <strong>${org.name}</strong>.</p><p><a href="${approvalUrl}" style="display:inline-block;background:#215CE5;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;">Click here to approve</a></p>`,
      fromName: "Campaign Lite",
      fromEmail: smtp?.fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@campaignlite.dev",
      campaignId: "approval",
      smtp,
    });
  } catch { /* best-effort */ }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // NextAuth v5 beta: trustHost not available in this version;
  // AUTH_URL env var handles CSRF origin validation
  providers: [
    // Google OAuth — only enabled when credentials are configured
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
    Credentials({
      id: "signup",
      name: "Sign Up",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
          name: { label: "Name", type: "text" },
          orgName: { label: "Organization", type: "text" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;
          const email = credentials.email as string;
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) throw new Error("Email already registered");

          const hash = await bcrypt.hash(credentials.password as string, 12);
          const orgName = (credentials.orgName as string) || email.split("@")[0];
          const org = await prisma.organization.create({
            data: {
              name: orgName,
              slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now(),
            },
          });
          const existingApproved = await prisma.user.findFirst({
            where: { organizationId: org.id, approved: true },
          });
          const user = await prisma.user.create({
            data: {
              email, name: (credentials.name as string) || email.split("@")[0],
              password: hash, organizationId: org.id, role: "admin",
              approved: !existingApproved,
            },
          });
          if (!user.approved) {
            sendApprovalNotification(email, org).catch(() => {});
            throw new Error("Account created. Awaiting admin approval.");
          }
          return { id: user.id, email: user.email, name: user.name };
        },
      }),
    // Password-based login for existing users (always available)
    Credentials({
      id: "login",
      name: "Sign In",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }
        const email = credentials.email as string;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new Error("No account registered with this email. Sign up first.");
        }
        if (!user.password) {
          throw new Error("This account uses a different sign-in method (e.g. Google). ");
        }
        if (!user.approved) throw new Error("Account awaiting admin approval");
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) throw new Error("Incorrect password");
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Dev login (email only, no password) — only in development
    ...(process.env.NODE_ENV !== "production" ? [Credentials({
      id: "dev",
      name: "Dev Login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email as string;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const org = await prisma.organization.create({
            data: {
              name: email.split("@")[0] + "'s Org",
              slug: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-"),
            },
          });
          user = await prisma.user.create({
            data: { email, name: email.split("@")[0], organizationId: org.id, role: "admin", approved: true },
          });
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    })] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth gate: block sign-in if user has no organization (not yet provisioned).
      // When Google is enabled, users must be manually approved by an admin first.
      if (account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
        if (!dbUser?.organizationId) return false; // Reject — no org assigned
        if (!dbUser?.approved) return "/pending";   // Redirect to pending page
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { role: true, approved: true } });
        if (dbUser) { token.role = dbUser.role; token.approved = dbUser.approved; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role || "user";
        (session.user as any).approved = token.approved ?? true;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/login", error: "/auth/login" },
});

// RBAC helpers — re-exported from rbac.ts for backward compat
export type { UserRole } from "./rbac";
export { PERMISSIONS, canAccess } from "./rbac";
