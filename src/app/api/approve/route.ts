import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/session-utils";
import { verifyLink } from "@/lib/link-signing";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    // Signed token path — valid even without a session (email-based approval)
    const payload = verifyLink(token);
    if (!payload || payload.purpose !== "approve") {
      return new NextResponse("Invalid or expired approval link", { status: 400 });
    }

    const email = payload.email;
    const orgId = payload.orgId;
    if (!email || !orgId) {
      return new NextResponse("Missing email or orgId in token", { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { email, organizationId: orgId } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    if (user.approved) {
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p style="font-size:18px;color:#333">${email} is already approved. <a href="/auth/login">Sign in</a></p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { approved: true, approvedAt: new Date(), approvedBy: "signed-link" },
    });

    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p style="font-size:20px;color:#16a34a;text-align:center">${email} has been approved!<br><a href="/auth/login" style="font-size:16px;color:#215CE5;">Sign in to Campaign Lite</a></p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Fallback: require authenticated admin of the same org
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const orgId = await requireOrg(session);
  const email = searchParams.get("email");
  if (!email) return new NextResponse("Missing email", { status: 400 });

  // Verify admin role
  const admin = await prisma.user.findUnique({ where: { email: session.user.email || "" } });
  if (!admin || admin.role !== "admin" || admin.organizationId !== orgId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const user = await prisma.user.findFirst({ where: { email, organizationId: orgId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  if (user.approved) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p style="font-size:18px;color:#333">${email} is already approved. <a href="/auth/login">Sign in</a></p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { approved: true, approvedAt: new Date(), approvedBy: session.user.email || "admin" },
  });

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p style="font-size:20px;color:#16a34a;text-align:center">${email} has been approved!<br><a href="/auth/login" style="font-size:16px;color:#215CE5;">Sign in to Campaign Lite</a></p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}