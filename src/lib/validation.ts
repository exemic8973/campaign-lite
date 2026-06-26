import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { getOrgId } from "./session-utils";

/** Shared validation schemas */
export const schemas = {
  contact: {
    create: z.object({ email: z.string().email().optional(), phone: z.string().optional(), firstName: z.string().optional(), lastName: z.string().optional(), tags: z.union([z.string(), z.array(z.string())]).optional() }),
    update: z.object({ email: z.string().email().optional(), phone: z.string().optional(), firstName: z.string().optional(), lastName: z.string().optional(), tags: z.union([z.string(), z.array(z.string())]).optional() }),
  },
  segment: {
    create: z.object({ name: z.string().min(1), description: z.string().optional(), rules: z.any().optional(), contactCount: z.number().optional() }),
    update: z.object({ name: z.string().min(1).optional(), description: z.string().optional(), rules: z.any().optional() }),
  },
  campaign: {
    create: z.object({ name: z.string().min(1), type: z.enum(["email", "sms"]).optional(), subject: z.string().optional(), fromName: z.string().optional(), fromEmail: z.string().optional(), templateId: z.string().optional(), segmentId: z.string().optional(), trackOpens: z.boolean().optional(), trackClicks: z.boolean().optional(), isAbTest: z.boolean().optional(), subjectB: z.string().optional(), splitPercent: z.number().optional() }),
    update: z.object({ name: z.string().optional(), subject: z.string().optional(), fromName: z.string().optional(), fromEmail: z.string().optional(), status: z.string().optional(), templateId: z.string().nullable().optional(), segmentId: z.string().nullable().optional(), trackOpens: z.boolean().optional(), trackClicks: z.boolean().optional(), sentCount: z.number().optional(), openCount: z.number().optional(), clickCount: z.number().optional(), bounceCount: z.number().optional(), unsubscribeCount: z.number().optional(), totalRecipients: z.number().optional() }),
  },
  template: {
    create: z.object({ name: z.string().min(1), description: z.string().optional(), subject: z.string().optional(), bodyHtml: z.string().optional(), category: z.string().optional(), organizationId: z.string().optional() }),
    update: z.object({ name: z.string().optional(), description: z.string().optional(), subject: z.string().optional(), bodyHtml: z.string().optional(), category: z.string().optional() }),
  },
  workflow: {
    create: z.object({ name: z.string().min(1), description: z.string().optional(), triggerType: z.string().optional(), triggerConfig: z.any().optional() }),
    update: z.object({ name: z.string().optional(), description: z.string().optional(), status: z.string().optional(), triggerType: z.string().optional(), triggerConfig: z.any().optional(), nodes: z.array(z.any()).optional(), edges: z.array(z.any()).optional() }),
  },
  smtp: z.object({ host: z.string().optional(), port: z.number().optional(), user: z.string().optional(), pass: z.string().optional(), fromEmail: z.string().optional(), fromName: z.string().optional() }),
  figmaToken: z.object({ figmaToken: z.string().optional().nullable() }),
  figmaImport: z.object({ demo: z.boolean().optional(), fileKey: z.string().optional(), frameId: z.string().optional(), templateIndex: z.number().optional(), name: z.string().optional(), createCampaign: z.boolean().optional(), isCommunity: z.boolean().optional() }),
};

type AnySchema = z.ZodType<any>;

/** Authenticated + org-resolved + validated route wrapper */
export async function withOrg<T extends AnySchema>(
  schema: T,
  handler: (ctx: { orgId: string; input: z.infer<T>; req: NextRequest }) => Promise<Response>
): Promise<(req: NextRequest) => Promise<Response>> {
  return async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId(session);
    if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    let input: any = {};
    try {
      if (req.method !== "GET" && req.method !== "DELETE") {
        input = await req.json().catch(() => ({}));
      }
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
      }
      return handler({ orgId, input: parsed.data, req });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
  };
}
