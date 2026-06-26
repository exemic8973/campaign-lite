import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const orgId = searchParams.get("orgId");

  if (!email || !orgId) {
    return new NextResponse("Missing email or orgId", { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email, organizationId: orgId },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  if (user.approved) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p style="font-size:18px;color:#333">${email} is already approved. <a href="/auth/login">Sign in</a></p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Approve the user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      approved: true,
      approvedAt: new Date(),
      approvedBy: "admin-link",
    },
  });

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p style="font-size:20px;color:#16a34a;text-align:center">${email} has been approved!<br><a href="/auth/login" style="font-size:16px;color:#215CE5;">Sign in to Campaign Lite</a></p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
