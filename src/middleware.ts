import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public endpoints that don't require authentication
const PUBLIC_PATHS = [
  "/api/auth/",
  "/api/webhooks/email",
  "/api/track/open",
  "/api/unsubscribe",
  "/api/approve",
  "/api/health",
  "/auth/login",
  "/auth/signup",
  "/api/logout",
  "/_next/",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  for (const pub of PUBLIC_PATHS) {
    if (pathname.startsWith(pub)) return NextResponse.next();
  }

  // Static files pass through
  if (pathname.match(/\.(ico|png|svg|jpg|jpeg|gif|css|js|woff2?)$/)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("__Secure-authjs.session-token")
    || request.cookies.get("authjs.session-token");

  // Redirect to login if no session for app pages and /api/
  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
