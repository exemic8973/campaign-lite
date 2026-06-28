import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public endpoints that don't require authentication
const PUBLIC_PATHS = [
  "/api/auth/",
  "/api/webhooks/email",
  "/api/track/open",
  "/api/unsubscribe",
  "/api/approve",
  "/api/health",
  "/api/cron/",
  "/auth/login",
  "/auth/signup",
  "/api/logout",
  "/_next/",
  "/favicon.ico",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  for (const pub of PUBLIC_PATHS) {
    if (pathname.startsWith(pub)) return NextResponse.next();
  }

  // Static files pass through
  if (pathname.match(/\.(ico|png|svg|jpg|jpeg|gif|css|js|woff2?)$/)) {
    return NextResponse.next();
  }

  // Validate JWT via next-auth (Edge-compatible — reads cookie, verifies signature)
  // NextAuth v5 uses __Secure-authjs.session-token on HTTPS (Vercel),
  // but next-auth/jwt doesn't look for the __Secure- prefixed cookie by default.
  const isHttps = request.nextUrl.protocol === "https:" || !!process.env.VERCEL;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: isHttps
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block unapproved users from app pages and non-public APIs
  if (token.approved === false) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }
    // Redirect unapproved users to the pending page
    if (pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
