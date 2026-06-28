import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { z } from "zod";

const contactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  batch: z.array(z.record(z.string())).optional(),
});

export async function GET(request: NextRequest) {
  return withOrg(async ({ orgId }) => {
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

    const serialized = contacts.map(c => ({ ...c, tags: JSON.stringify(c.tags || []) }));
    return NextResponse.json({ contacts: serialized, total, page, limit });
  })(request);
}

export async function POST(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof contactSchema>;

    if (body.batch) {
      const batch = body.batch.map((c: Record<string, string>) => ({
        email: c.email || null,
        phone: c.phone || null,
        firstName: c.firstName || c.first_name || null,
        lastName: c.lastName || c.last_name || null,
        tags: c.tags ? c.tags.split(",").map((t: string) => t.trim()) : [],
        source: "import",
        organizationId: orgId,
      }));
      const result = await prisma.contact.createMany({ data: batch });
      return NextResponse.json({ imported: result.count });
    }

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
  }, { schema: contactSchema })(request);
}

const updateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
});

export async function PUT(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof updateSchema>;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

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
  }, { schema: updateSchema })(request);
}

export async function DELETE(request: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { count } = await prisma.contact.deleteMany({ where: { id, organizationId: orgId } });
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  })(request);
}
