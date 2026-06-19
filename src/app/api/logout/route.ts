import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(new URL("/auth/login", process.env.AUTH_URL || "http://localhost:3000"));

  // Clear all potential NextAuth cookies
  response.cookies.delete("next-auth.session-token");
  response.cookies.delete("__Secure-next-auth.session-token");
  response.cookies.delete("next-auth.csrf-token");
  response.cookies.delete("__Secure-next-auth.csrf-token");
  response.cookies.delete("next-auth.callback-url");

  return response;
}
