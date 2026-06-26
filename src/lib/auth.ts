import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    Google,
    // Dev login: only available outside production
    ...(process.env.NODE_ENV !== "production" ? [Credentials({
      id: "dev",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email as string;

        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          const org = await prisma.organization.create({
            data: {
              name: email.split("@")[0] + "'s Org",
              slug: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-"),
            },
          });

          user = await prisma.user.create({
            data: {
              email,
              name: email.split("@")[0],
              organizationId: org.id,
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    })] : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Set user.id on first sign-in for ALL providers
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
});
