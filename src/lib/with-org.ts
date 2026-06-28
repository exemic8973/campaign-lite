import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { getOrgId } from "./session-utils";
import { hasMinRole, type UserRole } from "./rbac";
import { ZodSchema, ZodError } from "zod";

export interface OrgContext {
  orgId: string;
  userId: string;
  userEmail: string;
  role: UserRole;
  approved: boolean;
}

interface WithOrgOptions<T = unknown> {
  /** Optional Zod schema to validate the request body. If not provided, raw body is passed as input. */
  schema?: ZodSchema<T>;
  /** Minimum role required. Defaults to "user" (any authenticated user). */
  minRole?: UserRole;
  /** Whether to require the user to be approved. Defaults to true. */
  requireApproved?: boolean;
  /** Whether to skip org resolution (for super-admin routes). Defaults to false. */
  skipOrg?: boolean;
}

/**
 * Centralized guard that wraps any API route handler with:
 * 1. Session authentication (401 if missing)
 * 2. Organization resolution (404 if none)
 * 3. Approval check (403 if not approved)
 * 4. Optional role enforcement via canAccess
 * 5. Optional Zod schema validation of request body
 *
 * The handler receives a typed, guaranteed-scoped context.
 */
export function withOrg<TSchema = unknown>(
  handler: (ctx: OrgContext & { input: TSchema; req: NextRequest }) => Promise<Response>,
  options: WithOrgOptions<TSchema> = {}
) {
  const { schema, minRole = "user", requireApproved = true, skipOrg = false } = options;

  return async (req: NextRequest): Promise<Response> => {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Resolve org
    let orgId: string | null = null;
    if (!skipOrg) {
      orgId = await getOrgId(session);
      if (!orgId) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
    }

    // 3. Build context
    const ctx: OrgContext = {
      orgId: orgId || "",
      userId: (session.user as any).id || "",
      userEmail: session.user.email,
      role: ((session.user as any).role || "user") as UserRole,
      approved: (session.user as any).approved ?? true,
    };

    // 4. Approval check
    if (requireApproved && !ctx.approved) {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    // 5. Role rank check (hierarchical, not resource-based)
    if (!hasMinRole(ctx.role, minRole)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // 6. Parse & validate input
    let input: TSchema = undefined as unknown as TSchema;
    if (schema) {
      try {
        const body = await req.json().catch(() => ({}));
        const parsed = schema.parse(body);
        input = parsed;
      } catch (err) {
        if (err instanceof ZodError) {
          return NextResponse.json({ error: "Invalid input", details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
    }

    // 7. Call handler
    return handler({ ...ctx, input, req });
  };
}
