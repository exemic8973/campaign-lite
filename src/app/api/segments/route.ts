import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { z } from "zod";

// Allowed fields for segment conditions (prevent arbitrary column access)
const ALLOWED_FIELDS = new Set(["email", "phone", "firstName", "lastName", "tags", "isSubscribed", "createdAt", "source"]);

async function evaluateSegmentCount(orgId: string, rules: any): Promise<number> {
  if (!rules?.conditions?.length) return 0;
  const where: any = { organizationId: orgId };
  const ops = rules.logic === "or" ? "OR" : "AND";
  where[ops] = rules.conditions.map((cond: any) => {
    const { field, operator, value } = cond;
    if (!ALLOWED_FIELDS.has(field)) return { id: "" };
    switch (operator) {
      case "contains": return { [field]: { contains: value } };
      case "equals": return { [field]: value === "true" ? true : value === "false" ? false : value };
      case "notEquals": return { [field]: { not: value === "true" ? true : value === "false" ? false : value } };
      case "has": return { tags: { has: value } };
      case "notHas": return { NOT: { tags: { has: value } } };
      case "before": return { [field]: { lt: new Date(value) } };
      case "after": return { [field]: { gt: new Date(value) } };
      default: return { [field]: { contains: value } };
    }
  });
  return prisma.contact.count({ where });
}

export async function GET(_req: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const segments = await prisma.segment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, contactCount: true, rules: true, createdAt: true },
    });
    return NextResponse.json(segments);
  })(_req);
}

const segmentSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  rules: z.any().optional().nullable(),
});

export async function POST(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof segmentSchema>;
    const rules = body.rules || null;
    const contactCount = rules ? await evaluateSegmentCount(orgId, rules) : 0;
    const segment = await prisma.segment.create({
      data: { name: body.name, description: body.description || null, rules, contactCount, organizationId: orgId },
    });
    return NextResponse.json(segment);
  }, { schema: segmentSchema })(request);
}

export async function PUT(request: NextRequest) {
  return withOrg(async ({ orgId, input, req }) => {
    const body = input as z.infer<typeof segmentSchema>;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const rules = body.rules || null;
    const contactCount = rules ? await evaluateSegmentCount(orgId, rules) : 0;

    const { count } = await prisma.segment.updateMany({
      where: { id, organizationId: orgId },
      data: { name: body.name, description: body.description, rules, contactCount },
    });
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const segment = await prisma.segment.findUnique({ where: { id } });
    return NextResponse.json(segment);
  }, { schema: segmentSchema })(request);
}

export async function DELETE(request: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { count } = await prisma.segment.deleteMany({ where: { id, organizationId: orgId } });
    if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  })(request);
}
