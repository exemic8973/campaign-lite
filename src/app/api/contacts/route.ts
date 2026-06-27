import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
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

  // Serialize tags arrays as JSON strings for backward compat
  const serialized = contacts.map(c => ({ ...c, tags: JSON.stringify(c.tags || []) }));
  return NextResponse.json({ contacts: serialized, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
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

  // Handle single contact - tags is now a native array
  const tags: string[] = Array.isArray(body.tags) ? body.tags : (typeof body.tags === "string" ? JSON.parse(body.tags || "[]") : []);
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

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await request.json();
  const tags: string[] = Array.isArray(body.tags) ? body.tags : (typeof body.tags === "string" ? JSON.parse(body.tags || "[]") : []);

  const { count } = await prisma.contact.updateMany({
    where: { id, organizationId: orgId },
    data: {
      email: body.email || null,
      phone: body.phone || null,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      tags,
    },
  });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contact = await prisma.contact.findUnique({ where: { id } });
  return NextResponse.json(contact);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { count } = await prisma.contact.deleteMany({ where: { id, organizationId: orgId } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
