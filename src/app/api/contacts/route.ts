import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getUserOrg(session: any) {
  const email = session?.user?.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.organizationId || null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrg(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = { organizationId: orgId };
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getUserOrg(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();

  if (body.batch) {
    const batch = body.batch.map((c: Record<string, string>) => ({
      email: c.email || null,
      phone: c.phone || null,
      firstName: c.firstName || c.first_name || null,
      lastName: c.lastName || c.last_name || null,
      tags: c.tags ? JSON.stringify(c.tags.split(",").map((t: string) => t.trim())) : "[]",
      source: "import",
      organizationId: orgId,
    }));
    const result = await prisma.contact.createMany({ data: batch });
    return NextResponse.json({ imported: result.count });
  }

  // Handle single contact - tags may already be JSON string from client
  const tags = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags || []);
  const contact = await prisma.contact.create({
    data: {
      email: body.email || null,
      phone: body.phone || null,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      tags,
      source: "manual",
      organizationId: orgId,
    },
  });
  return NextResponse.json(contact);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await request.json();
  const tags = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags || []);

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      email: body.email || null,
      phone: body.phone || null,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      tags,
    },
  });
  return NextResponse.json(contact);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
