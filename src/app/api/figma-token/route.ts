import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOrg } from "@/lib/with-org";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const figmaSchema = z.object({
  figmaToken: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest) {
  return withOrg(async ({ orgId, input }) => {
    const body = input as z.infer<typeof figmaSchema>;
    const figmaToken = body.figmaToken ? encrypt(body.figmaToken) : null;
    await prisma.organization.update({
      where: { id: orgId },
      data: { figmaToken },
    });
    return NextResponse.json({ ok: true });
  }, { schema: figmaSchema, minRole: "manager" })(request);
}

export async function GET(_req: NextRequest) {
  return withOrg(async ({ orgId }) => {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { figmaToken: true },
    });
    return NextResponse.json({ configured: !!(org?.figmaToken || process.env.FIGMA_ACCESS_TOKEN) });
  })(_req);
}
