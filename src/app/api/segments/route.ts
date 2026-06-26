import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgId } from "@/lib/session-utils";

// Allowed fields for segment conditions (prevent arbitrary column access)
const ALLOWED_FIELDS = new Set(["email", "phone", "firstName", "lastName", "tags", "isSubscribed", "createdAt", "source"]);

// Evaluate segment rules and return matching contact count
async function evaluateSegmentCount(orgId: string, rules: any): Promise<number> {
  if (!rules?.conditions?.length) return 0;

  const where: any = { organizationId: orgId };

  const ops = rules.logic === "or" ? "OR" : "AND";
  where[ops] = rules.conditions.map((cond: any) => {
    const { field, operator, value } = cond;
    // Reject unknown fields
    if (!ALLOWED_FIELDS.has(field)) {
      // Return a condition that matches nothing
      return { id: "" };
    }
    switch (operator) {
      case "contains":
        return { [field]: { contains: value } };
      case "equals":
        return { [field]: value === "true" ? true : value === "false" ? false : value };
      case "notEquals":
        return { [field]: { not: value === "true" ? true : value === "false" ? false : value } };
      case "has":
        // Tags are stored as JSON string - use contains on the string
        return { tags: { contains: value } };
      case "notHas":
        return { tags: { not: { contains: value } } };
      case "before":
        return { [field]: { lt: new Date(value) } };
      case "after":
        return { [field]: { gt: new Date(value) } };
      default:
        return { [field]: { contains: value } };
    }
  });

  return prisma.contact.count({ where });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const segments = await prisma.segment.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, contactCount: true, rules: true, createdAt: true },
  });
  return NextResponse.json(segments);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  const rules = body.rules || null;
  const contactCount = rules ? await evaluateSegmentCount(orgId, rules) : 0;

  const segment = await prisma.segment.create({
    data: { name: body.name, description: body.description || null, rules, contactCount, organizationId: orgId },
  });
  return NextResponse.json(segment);
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
  const rules = body.rules || null;
  const contactCount = rules ? await evaluateSegmentCount(orgId, rules) : 0;

  const segment = await prisma.segment.update({
    where: { id },
    data: { name: body.name, description: body.description, rules, contactCount },
  });
  return NextResponse.json(segment);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.segment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
