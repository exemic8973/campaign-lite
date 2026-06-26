# Campaign Lite — Campaign management platform for freelancers

## Stack
- **Next.js 15** (App Router) + **React 18**
- **Tailwind CSS v4** + **shadcn/ui** (custom slate/blue palette)
- **Prisma ORM** — SQLite dev / Postgres production (15 models)
- **NextAuth v5** — JWT auth with dev email login + Google OAuth
- **Email** — nodemailer (SMTP settings UI) + Resend SDK fallback; dev mode simulates sends
- **Icons** — lucide-react, Geist font
- **Workflows** — @xyflow/react (React Flow for drag-and-drop builder)

## Layout
- `prisma/schema.prisma` — 15 models (Organization with smtpHost/Port/User/Pass, figmaToken; Campaign with isAbTest/subjectB/splitPercent; Workflow/Node/Edge/Execution/Log)
- `src/app/(dashboard)/` — campaigns/ contacts/ segments/ templates/ workflows/ settings/ figma/
- `src/app/api/` — 27 route handlers: CRUD + auth + figma + smtp + tracking + webhooks + seed
- `src/app/auth/login/` — Login page with dev email + Google OAuth
- `src/components/ui/` — 15 shadcn-style primitives (button, card, dialog, popover, table, etc.)
- `src/components/workflow/` — React Flow canvas (7 node types), palette, builder
- `src/lib/` — auth.ts, db.ts (Prisma singleton), email.ts (SMTP/Resend/sim), figma-to-email.ts, session-utils.ts, workflow-engine.ts, seed scripts
- `src/middleware.ts` — Empty matcher; auth handled per-page

## Commands
- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build (type-checks + compiles)
- `npm run lint` — ESLint via Next.js
- `npx prisma db push` — Sync schema to database (creates SQLite dev.db)
- `npx prisma generate` — Regenerate Prisma Client after schema changes

## Conventions
- **Server Components** by default; `"use client"` only in leaf interactive components (forms, motion, React Flow)
- **Auth:** Every page calls `auth()` then redirects; API routes use `getOrgId(session)` from session-utils.ts (email-based lookup — session.user.id is absent in JWT)
- **SQLite arrays:** Tags and variables stored as JSON strings; parse via `JSON.parse()` on read, stringify on write
- **Seeding:** All modules auto-seed if empty on first visit via `seedAll()` in seed-all.ts (contacts, templates, campaigns, segments, workflows)

## Watch out for
- **session.user.id is undefined** — JWT only persists email; always use `session.user.email` + `getOrgId()` from session-utils.ts
- **Stale JWT cookie** after database reset causes redirect loop; login page auto-redirects to `/api/logout` to clear cookies
- **Figma outlined text** — If text is converted to vectors in Figma, GROUP names are used as fallback (no formatting preserved)
- **Figma rate limits** — Free Figma API ~60 req/min; imports add 500ms delay + auto-retry on 429
- **Port conflicts** — Only one dev server at a time; kill old PID before restarting: `taskkill /F /PID $(netstat -ano | findstr ":3000 LISTENING" | awk '{print $5}')`
- **Segment member records** — Rule-based segments don't create `SegmentMember` rows; the send route evaluates rules directly against contacts
- Engineering Brief — Harden "Campaign Lite" to Production-Grade Multi-Tenant SaaS

> Paste this entire document as the task prompt. It is self-contained. Follow it phase by phase.

---

## 0. Your role and mission

You are a **senior full-stack engineer** taking ownership of an existing Next.js 15 (App Router) email-campaign platform called **Campaign Lite**. It is currently an MVP with **critical, exploitable security flaws** and is **not safe for multi-tenant production use**. Your mission is to transform it into a secure, scalable, production-ready SaaS without regressing existing user-facing features.

Work in the **priority order below (Phase 1 → 5)**. Do not skip Phase 1 items — they are exploitable breaches. After each phase, output a summary of changed files, new migrations, and test results before continuing.

---

## 1. Project context

**Stack:** Next.js 15 (App Router) · React 18 · TypeScript (strict) · Prisma ORM · NextAuth v5 (JWT) · nodemailer + Resend · Tailwind v4 + shadcn/ui · @xyflow/react (workflow builder) · Zod (installed, currently unused).

**Tenancy model:** Each `User` belongs to one `Organization`. All data (`Contact`, `Segment`, `Campaign`, `Template`, `Workflow`, etc.) is owned by an `Organization`. The session is JWT; the org is resolved from `session.user.email` via `getOrgId()` in `src/lib/session-utils.ts`.

**Key files:**
- `src/lib/auth.ts` — NextAuth config (Google + a dev Credentials provider)
- `src/lib/session-utils.ts` — `getOrgId(session)`, `getUserId(session)`, `requireOrg(session)`
- `src/lib/db.ts` — Prisma singleton
- `src/lib/email.ts` — SMTP/Resend send + `replaceVariables`
- `src/lib/workflow-engine.ts` — workflow execution
- `src/app/api/**` — 27 route handlers (CRUD, auth, figma, smtp, tracking, webhooks, seed)
- `prisma/schema.prisma` — 15 models, **currently SQLite**

---

## 2. Operating rules (apply to every change)

1. **Preserve existing user-facing behavior and route paths/response shapes** unless a security fix requires a change. If you must make a breaking change, document it explicitly in your phase report.
2. **Use versioned Prisma migrations** (`prisma migrate`), not `db push`. Commit migration files.
3. Every change must **typecheck (`tsc`), lint (`next lint`), and build** clean.
4. **Add or update tests for every fix.** A fix without a test does not count as done.
5. **Never commit secrets.** All keys/tokens come from environment variables. Add new vars to `.env.example` with placeholder values.
6. Prefer **small, reviewable commits**, one logical change each, with clear messages.
7. Where this brief is unambiguous, follow it exactly. If you hit a genuine blocker or ambiguity, **state your assumption and proceed** — do not silently invent behavior.
8. Do not introduce `any` where a real type is feasible. Keep TypeScript strict mode honest.

---

## 3. The work

### PHASE 1 — Security (P0 — exploitable breaches, do these first)

#### 1.1 Fix broken tenant isolation (IDOR / OWASP API #1) across ALL endpoints
**Problem:** Update/delete/read-by-id operations look up records by `id` alone, with no organization check. Any authenticated user can read, edit, or delete *any other organization's* records by changing an ID. Affected files include (verify exhaustively — there may be more):
- `src/app/api/contacts/route.ts` (PUT, DELETE)
- `src/app/api/campaigns/route.ts` (PUT, DELETE)
- `src/app/api/campaigns/[id]/send/route.ts` (uses `session.user.id`, which is undefined)
- `src/app/api/templates/route.ts` (PUT, DELETE)
- `src/app/api/segments/route.ts` (PUT, DELETE)
- `src/app/api/workflows/[id]/route.ts` (GET, PUT, DELETE — **no org check at all**)
- `src/app/api/workflows/[id]/execute/route.ts`

**Required fix:**
- Resolve `orgId` via `requireOrg(session)` in every authenticated handler.
- **Reads:** use `findFirst({ where: { id, organizationId: orgId } })`; return 404 if null.
- **Updates/deletes:** use `updateMany`/`deleteMany` with `where: { id, organizationId: orgId }`; if `count === 0`, return 404. (This guarantees you can never mutate another org's row.)
- For nested resources (workflow nodes/edges, campaign events), verify the parent belongs to the org before mutating children.

**Acceptance criteria:** An integration test proves that a user in Org A receives **404** when attempting GET/PUT/DELETE/execute on a record owned by Org B, for every resource type.

#### 1.2 Gate the dev login behind non-production AND require real auth
**Problem:** The `Credentials` "dev" provider in `src/lib/auth.ts` accepts **any email with no password** and auto-creates an org/user. It is always registered, so it is a full auth bypass in production.
**Required fix:**
- Only register the dev Credentials provider when `process.env.NODE_ENV !== "production"`.
- Ensure at least one real production auth path works end-to-end (Google OAuth, and/or add an email magic-link provider). Document required env vars.
- Add a runtime guard so the app refuses to boot in production if no real provider is configured.

**Acceptance:** Test confirms the dev provider is absent when `NODE_ENV=production`.

#### 1.3 Fix JWT identity and standardize org resolution
**Problem:** `session.user.id` is undefined for dev-login JWTs (documented in REASONIX.md); `campaigns/[id]/send` relies on it, breaking authorization.
**Required fix:** In the `jwt` callback, set `token.id` for **all** providers (not only when `account` is present). Standardize every route on `getOrgId(session)` / `requireOrg(session)`. Remove any reliance on `session.user.id` for authorization.

#### 1.4 Verify inbound email-webhook signatures
**Problem:** `src/app/api/webhooks/email/route.ts` trusts any POST. Forged events can poison analytics and mass-unsubscribe contacts (a `complaint` flips `isSubscribed=false`). `campaignId` from the body is used in an unscoped `campaign.update`.
**Required fix:**
- Verify the provider signature (Resend uses **Svix**; validate the `svix-id`/`svix-timestamp`/`svix-signature` headers against `RESEND_WEBHOOK_SECRET`). Reject (401) on failure.
- Resolve the campaign and contact through your own DB and **scope all updates by the resolved org**. Never trust IDs from the payload for cross-tenant writes.
- Make event recording idempotent (dedupe on provider message id).

#### 1.5 Sign unsubscribe and open-tracking links (HMAC)
**Problem:** `unsubscribe/route.ts` and `track/open/route.ts` accept raw `contactId`/`campaignId`, so anyone can unsubscribe others or inflate open metrics by enumerating IDs.
**Required fix:** Issue **HMAC-SHA256 signed tokens** for these links (`token = HMAC(secret, contactId|campaignId|purpose)`). Verify with a **constant-time comparison** before acting. Reject invalid/expired tokens. Keep unsubscribe one-click and idempotent (CAN-SPAM/GDPR compliant).

#### 1.6 Make SMTP config per-send (remove the shared singleton)
**Problem:** `src/lib/email.ts` holds SMTP config in a **module-level variable** (`let smtpConfig`). Concurrent sends from different orgs can leak one org's emails through another org's SMTP credentials.
**Required fix:** Pass the resolved SMTP config (and from-identity) as explicit arguments to the send function per call. Remove all module-level mutable state. Build a fresh transporter per send (or a keyed pool), never a shared global.

#### 1.7 Encrypt secrets at rest
**Problem:** `smtpPass` and `figmaToken` are stored in plaintext.
**Required fix:** Add an app-level **AES-256-GCM** encryption helper (`encrypt(value)` / `decrypt(value)`), key from `ENCRYPTION_KEY` (32-byte, base64). Encrypt on write, decrypt on use. Keep the masked (`••••••••`) GET response behavior. Provide a migration/backfill note for existing rows.

---

### PHASE 2 — Input validation & data layer

#### 2.1 Validate every request body and query with Zod
Zod is installed but unused. Create per-route schemas and a shared wrapper that (a) authenticates, (b) resolves `orgId`, (c) validates input, then calls the handler with typed, safe values. Reject malformed input with 400 and a structured error. No handler should call `await request.json()` and trust the result.

#### 2.2 Migrate SQLite → Postgres with proper types
- Switch the Prisma datasource to `postgresql`.
- Replace free-text status/role/type columns with **Prisma enums** (`CampaignStatus`, `UserRole`, `WorkflowStatus`, `NodeType`, etc.).
- Replace the JSON-string `tags`/`variables` hacks with proper `String[]`/`Json` columns; migrate existing data.
- Fix indexes (the `@@index([organizationId, tags])` on a JSON string is ineffective). Add indexes that match real query patterns.
- Generate proper migrations.

#### 2.3 Allowlist segment query fields
In both `segments/route.ts` and the send route, segment rules build Prisma `where` clauses from user-supplied `field` names. Restrict `field` to an explicit allowlist of contact columns; reject anything else.

---

### PHASE 3 — Asynchronous processing & scale

#### 3.1 Move campaign sending to a durable job queue
**Problem:** `campaigns/[id]/send` sends synchronously inside the HTTP request with per-recipient DB writes — it times out past a few hundred contacts and isn't resumable.
**Required fix:** Introduce a background queue (recommend **Inngest** or **BullMQ + Redis**, or QStash for serverless). The send endpoint should enqueue and return immediately. Implement:
- One **idempotent job per recipient** (dedupe key = campaignId+contactId) with retry/backoff.
- Resumable campaign state and a reconciliation step that finalizes status/counts; never leave a campaign stuck in `sending`.
- Batched, rate-limited dispatch respecting provider limits.

#### 3.2 Run the workflow engine on the same async infrastructure
Refactor `workflow-engine.ts` so each node executes as a durable, retryable step (delays become scheduled jobs, not in-process waits).

#### 3.3 Safe templating
Replace the naive `replaceVariables` string substitution with a real templating engine (**MJML** for layout and/or **Handlebars** for merge fields) with **auto-escaping** and HTML sanitization of merged values. Make tracking-pixel injection robust (don't rely on the template containing `</body>`).

---

### PHASE 4 — Hardening & operability

- **4.1 Rate limiting** on all public/unauthenticated endpoints (webhook, track, unsubscribe) and auth endpoints — e.g. `@upstash/ratelimit`.
- **4.2 Observability:** integrate **Sentry**, add structured logging (request id, org id), and **remove debug routes/`console.log`** (`figma-debug`, `debug/figma`, the `[DEV]` send log).
- **4.3 Audit log + soft deletes:** add an `AuditLog` model and replace hard `delete()` with soft deletes (`deletedAt`) for recoverability and GDPR/audit needs.
- **4.4 Health checks:** add `/api/health` (DB + queue connectivity).
- **4.5 Env validation:** validate `process.env` with Zod at boot; fail fast on missing required vars.

---

### PHASE 5 — Quality & process

- **5.1 Tests** (target meaningful coverage on critical paths):
  - Unit: segment evaluator, email/template rendering + escaping, HMAC token sign/verify, encryption round-trip, webhook signature verification.
  - **Integration: tenant-isolation suite** asserting cross-org access returns 404 for every resource (this is the most important suite).
  - E2E (Playwright): login, create campaign, send (queued), unsubscribe.
- **5.2 CI pipeline** (GitHub Actions): typecheck → lint → test → build on every PR.
- **5.3 Docs:** add `SECURITY.md`, update `README.md`/`.env.example` with all new vars (`RESEND_WEBHOOK_SECRET`, `ENCRYPTION_KEY`, queue/Redis URLs, Sentry DSN, link-signing secret).

---

## 4. Concrete patterns to follow

**Org-scoped mutation (use everywhere):**
```ts
const orgId = await requireOrg(session);
const { count } = await prisma.campaign.deleteMany({ where: { id, organizationId: orgId } });
if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

**Authenticated + validated route wrapper:**
```ts
export const withOrg = <T>(schema: ZodSchema<T>, handler: (ctx: { orgId: string; input: T; req: NextRequest }) => Promise<Response>) =>
  async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user) return json401();
    const orgId = await getOrgId(session);
    if (!orgId) return json404();
    const parsed = schema.safeParse(await readInput(req));
    if (!parsed.success) return json400(parsed.error.flatten());
    return handler({ orgId, input: parsed.data, req });
  };
```

**Signed link helper:**
```ts
// sign(payload) -> base64url; verify(token) -> payload | null  (constant-time)
// purpose-scoped: signLink({ contactId, campaignId, purpose: "unsubscribe" })
```

**Encryption helper:** AES-256-GCM, `ENCRYPTION_KEY` (base64, 32 bytes); store `iv:tag:ciphertext`.

**Webhook verification:** validate Svix headers against `RESEND_WEBHOOK_SECRET`; reject before any DB write.

---

## 5. Definition of done (must all be true)

- [ ] No endpoint can read or mutate another organization's data (proven by tests).
- [ ] Dev login is impossible in production; a real auth provider works.
- [ ] Webhook rejects unsigned/invalid payloads; unsubscribe/track links require valid HMAC tokens.
- [ ] No secrets stored in plaintext; none committed to the repo.
- [ ] No module-level mutable per-tenant state.
- [ ] Every route validates input with Zod.
- [ ] Running on Postgres with enums and versioned migrations.
- [ ] Campaign sends and workflows run asynchronously, are retryable and resumable, and never hang in `sending`.
- [ ] Rate limiting, Sentry, structured logging, health check, and env validation are in place; debug routes removed.
- [ ] CI is green (typecheck, lint, test, build); tenant-isolation suite passes.
- [ ] `SECURITY.md`, `README.md`, and `.env.example` updated.

---

## 6. Output format

For each phase, return:
1. A short summary of what changed and why.
2. The list of files created/modified/deleted.
3. New migration files.
4. Test results (and the new tests added).
5. Any assumptions made or breaking changes introduced.

At the very end, produce a **traceability table** mapping each numbered item in this brief (1.1 … 5.3) to the commit(s)/files that resolve it, so completeness can be verified at a glance.
- Engineering Brief — Harden "Campaign Lite" to Production-Grade Multi-Tenant SaaS

> Paste this entire document as the task prompt. It is self-contained. Follow it phase by phase.

---

## 0. Your role and mission

You are a **senior full-stack engineer** taking ownership of an existing Next.js 15 (App Router) email-campaign platform called **Campaign Lite**. It is currently an MVP with **critical, exploitable security flaws** and is **not safe for multi-tenant production use**. Your mission is to transform it into a secure, scalable, production-ready SaaS without regressing existing user-facing features.

Work in the **priority order below (Phase 1 → 5)**. Do not skip Phase 1 items — they are exploitable breaches. After each phase, output a summary of changed files, new migrations, and test results before continuing.

---

## 1. Project context

**Stack:** Next.js 15 (App Router) · React 18 · TypeScript (strict) · Prisma ORM · NextAuth v5 (JWT) · nodemailer + Resend · Tailwind v4 + shadcn/ui · @xyflow/react (workflow builder) · Zod (installed, currently unused).

**Tenancy model:** Each `User` belongs to one `Organization`. All data (`Contact`, `Segment`, `Campaign`, `Template`, `Workflow`, etc.) is owned by an `Organization`. The session is JWT; the org is resolved from `session.user.email` via `getOrgId()` in `src/lib/session-utils.ts`.

**Key files:**
- `src/lib/auth.ts` — NextAuth config (Google + a dev Credentials provider)
- `src/lib/session-utils.ts` — `getOrgId(session)`, `getUserId(session)`, `requireOrg(session)`
- `src/lib/db.ts` — Prisma singleton
- `src/lib/email.ts` — SMTP/Resend send + `replaceVariables`
- `src/lib/workflow-engine.ts` — workflow execution
- `src/app/api/**` — 27 route handlers (CRUD, auth, figma, smtp, tracking, webhooks, seed)
- `prisma/schema.prisma` — 15 models, **currently SQLite**

---

## 2. Operating rules (apply to every change)

1. **Preserve existing user-facing behavior and route paths/response shapes** unless a security fix requires a change. If you must make a breaking change, document it explicitly in your phase report.
2. **Use versioned Prisma migrations** (`prisma migrate`), not `db push`. Commit migration files.
3. Every change must **typecheck (`tsc`), lint (`next lint`), and build** clean.
4. **Add or update tests for every fix.** A fix without a test does not count as done.
5. **Never commit secrets.** All keys/tokens come from environment variables. Add new vars to `.env.example` with placeholder values.
6. Prefer **small, reviewable commits**, one logical change each, with clear messages.
7. Where this brief is unambiguous, follow it exactly. If you hit a genuine blocker or ambiguity, **state your assumption and proceed** — do not silently invent behavior.
8. Do not introduce `any` where a real type is feasible. Keep TypeScript strict mode honest.

---

## 3. The work

### PHASE 1 — Security (P0 — exploitable breaches, do these first)

#### 1.1 Fix broken tenant isolation (IDOR / OWASP API #1) across ALL endpoints
**Problem:** Update/delete/read-by-id operations look up records by `id` alone, with no organization check. Any authenticated user can read, edit, or delete *any other organization's* records by changing an ID. Affected files include (verify exhaustively — there may be more):
- `src/app/api/contacts/route.ts` (PUT, DELETE)
- `src/app/api/campaigns/route.ts` (PUT, DELETE)
- `src/app/api/campaigns/[id]/send/route.ts` (uses `session.user.id`, which is undefined)
- `src/app/api/templates/route.ts` (PUT, DELETE)
- `src/app/api/segments/route.ts` (PUT, DELETE)
- `src/app/api/workflows/[id]/route.ts` (GET, PUT, DELETE — **no org check at all**)
- `src/app/api/workflows/[id]/execute/route.ts`

**Required fix:**
- Resolve `orgId` via `requireOrg(session)` in every authenticated handler.
- **Reads:** use `findFirst({ where: { id, organizationId: orgId } })`; return 404 if null.
- **Updates/deletes:** use `updateMany`/`deleteMany` with `where: { id, organizationId: orgId }`; if `count === 0`, return 404. (This guarantees you can never mutate another org's row.)
- For nested resources (workflow nodes/edges, campaign events), verify the parent belongs to the org before mutating children.

**Acceptance criteria:** An integration test proves that a user in Org A receives **404** when attempting GET/PUT/DELETE/execute on a record owned by Org B, for every resource type.

#### 1.2 Gate the dev login behind non-production AND require real auth
**Problem:** The `Credentials` "dev" provider in `src/lib/auth.ts` accepts **any email with no password** and auto-creates an org/user. It is always registered, so it is a full auth bypass in production.
**Required fix:**
- Only register the dev Credentials provider when `process.env.NODE_ENV !== "production"`.
- Ensure at least one real production auth path works end-to-end (Google OAuth, and/or add an email magic-link provider). Document required env vars.
- Add a runtime guard so the app refuses to boot in production if no real provider is configured.

**Acceptance:** Test confirms the dev provider is absent when `NODE_ENV=production`.

#### 1.3 Fix JWT identity and standardize org resolution
**Problem:** `session.user.id` is undefined for dev-login JWTs (documented in REASONIX.md); `campaigns/[id]/send` relies on it, breaking authorization.
**Required fix:** In the `jwt` callback, set `token.id` for **all** providers (not only when `account` is present). Standardize every route on `getOrgId(session)` / `requireOrg(session)`. Remove any reliance on `session.user.id` for authorization.

#### 1.4 Verify inbound email-webhook signatures
**Problem:** `src/app/api/webhooks/email/route.ts` trusts any POST. Forged events can poison analytics and mass-unsubscribe contacts (a `complaint` flips `isSubscribed=false`). `campaignId` from the body is used in an unscoped `campaign.update`.
**Required fix:**
- Verify the provider signature (Resend uses **Svix**; validate the `svix-id`/`svix-timestamp`/`svix-signature` headers against `RESEND_WEBHOOK_SECRET`). Reject (401) on failure.
- Resolve the campaign and contact through your own DB and **scope all updates by the resolved org**. Never trust IDs from the payload for cross-tenant writes.
- Make event recording idempotent (dedupe on provider message id).

#### 1.5 Sign unsubscribe and open-tracking links (HMAC)
**Problem:** `unsubscribe/route.ts` and `track/open/route.ts` accept raw `contactId`/`campaignId`, so anyone can unsubscribe others or inflate open metrics by enumerating IDs.
**Required fix:** Issue **HMAC-SHA256 signed tokens** for these links (`token = HMAC(secret, contactId|campaignId|purpose)`). Verify with a **constant-time comparison** before acting. Reject invalid/expired tokens. Keep unsubscribe one-click and idempotent (CAN-SPAM/GDPR compliant).

#### 1.6 Make SMTP config per-send (remove the shared singleton)
**Problem:** `src/lib/email.ts` holds SMTP config in a **module-level variable** (`let smtpConfig`). Concurrent sends from different orgs can leak one org's emails through another org's SMTP credentials.
**Required fix:** Pass the resolved SMTP config (and from-identity) as explicit arguments to the send function per call. Remove all module-level mutable state. Build a fresh transporter per send (or a keyed pool), never a shared global.

#### 1.7 Encrypt secrets at rest
**Problem:** `smtpPass` and `figmaToken` are stored in plaintext.
**Required fix:** Add an app-level **AES-256-GCM** encryption helper (`encrypt(value)` / `decrypt(value)`), key from `ENCRYPTION_KEY` (32-byte, base64). Encrypt on write, decrypt on use. Keep the masked (`••••••••`) GET response behavior. Provide a migration/backfill note for existing rows.

---

### PHASE 2 — Input validation & data layer

#### 2.1 Validate every request body and query with Zod
Zod is installed but unused. Create per-route schemas and a shared wrapper that (a) authenticates, (b) resolves `orgId`, (c) validates input, then calls the handler with typed, safe values. Reject malformed input with 400 and a structured error. No handler should call `await request.json()` and trust the result.

#### 2.2 Migrate SQLite → Postgres with proper types
- Switch the Prisma datasource to `postgresql`.
- Replace free-text status/role/type columns with **Prisma enums** (`CampaignStatus`, `UserRole`, `WorkflowStatus`, `NodeType`, etc.).
- Replace the JSON-string `tags`/`variables` hacks with proper `String[]`/`Json` columns; migrate existing data.
- Fix indexes (the `@@index([organizationId, tags])` on a JSON string is ineffective). Add indexes that match real query patterns.
- Generate proper migrations.

#### 2.3 Allowlist segment query fields
In both `segments/route.ts` and the send route, segment rules build Prisma `where` clauses from user-supplied `field` names. Restrict `field` to an explicit allowlist of contact columns; reject anything else.

---

### PHASE 3 — Asynchronous processing & scale

#### 3.1 Move campaign sending to a durable job queue
**Problem:** `campaigns/[id]/send` sends synchronously inside the HTTP request with per-recipient DB writes — it times out past a few hundred contacts and isn't resumable.
**Required fix:** Introduce a background queue (recommend **Inngest** or **BullMQ + Redis**, or QStash for serverless). The send endpoint should enqueue and return immediately. Implement:
- One **idempotent job per recipient** (dedupe key = campaignId+contactId) with retry/backoff.
- Resumable campaign state and a reconciliation step that finalizes status/counts; never leave a campaign stuck in `sending`.
- Batched, rate-limited dispatch respecting provider limits.

#### 3.2 Run the workflow engine on the same async infrastructure
Refactor `workflow-engine.ts` so each node executes as a durable, retryable step (delays become scheduled jobs, not in-process waits).

#### 3.3 Safe templating
Replace the naive `replaceVariables` string substitution with a real templating engine (**MJML** for layout and/or **Handlebars** for merge fields) with **auto-escaping** and HTML sanitization of merged values. Make tracking-pixel injection robust (don't rely on the template containing `</body>`).

---

### PHASE 4 — Hardening & operability

- **4.1 Rate limiting** on all public/unauthenticated endpoints (webhook, track, unsubscribe) and auth endpoints — e.g. `@upstash/ratelimit`.
- **4.2 Observability:** integrate **Sentry**, add structured logging (request id, org id), and **remove debug routes/`console.log`** (`figma-debug`, `debug/figma`, the `[DEV]` send log).
- **4.3 Audit log + soft deletes:** add an `AuditLog` model and replace hard `delete()` with soft deletes (`deletedAt`) for recoverability and GDPR/audit needs.
- **4.4 Health checks:** add `/api/health` (DB + queue connectivity).
- **4.5 Env validation:** validate `process.env` with Zod at boot; fail fast on missing required vars.

---

### PHASE 5 — Quality & process

- **5.1 Tests** (target meaningful coverage on critical paths):
  - Unit: segment evaluator, email/template rendering + escaping, HMAC token sign/verify, encryption round-trip, webhook signature verification.
  - **Integration: tenant-isolation suite** asserting cross-org access returns 404 for every resource (this is the most important suite).
  - E2E (Playwright): login, create campaign, send (queued), unsubscribe.
- **5.2 CI pipeline** (GitHub Actions): typecheck → lint → test → build on every PR.
- **5.3 Docs:** add `SECURITY.md`, update `README.md`/`.env.example` with all new vars (`RESEND_WEBHOOK_SECRET`, `ENCRYPTION_KEY`, queue/Redis URLs, Sentry DSN, link-signing secret).

---

## 4. Concrete patterns to follow

**Org-scoped mutation (use everywhere):**
```ts
const orgId = await requireOrg(session);
const { count } = await prisma.campaign.deleteMany({ where: { id, organizationId: orgId } });
if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

**Authenticated + validated route wrapper:**
```ts
export const withOrg = <T>(schema: ZodSchema<T>, handler: (ctx: { orgId: string; input: T; req: NextRequest }) => Promise<Response>) =>
  async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user) return json401();
    const orgId = await getOrgId(session);
    if (!orgId) return json404();
    const parsed = schema.safeParse(await readInput(req));
    if (!parsed.success) return json400(parsed.error.flatten());
    return handler({ orgId, input: parsed.data, req });
  };
```

**Signed link helper:**
```ts
// sign(payload) -> base64url; verify(token) -> payload | null  (constant-time)
// purpose-scoped: signLink({ contactId, campaignId, purpose: "unsubscribe" })
```

**Encryption helper:** AES-256-GCM, `ENCRYPTION_KEY` (base64, 32 bytes); store `iv:tag:ciphertext`.

**Webhook verification:** validate Svix headers against `RESEND_WEBHOOK_SECRET`; reject before any DB write.

---

## 5. Definition of done (must all be true)

- [ ] No endpoint can read or mutate another organization's data (proven by tests).
- [ ] Dev login is impossible in production; a real auth provider works.
- [ ] Webhook rejects unsigned/invalid payloads; unsubscribe/track links require valid HMAC tokens.
- [ ] No secrets stored in plaintext; none committed to the repo.
- [ ] No module-level mutable per-tenant state.
- [ ] Every route validates input with Zod.
- [ ] Running on Postgres with enums and versioned migrations.
- [ ] Campaign sends and workflows run asynchronously, are retryable and resumable, and never hang in `sending`.
- [ ] Rate limiting, Sentry, structured logging, health check, and env validation are in place; debug routes removed.
- [ ] CI is green (typecheck, lint, test, build); tenant-isolation suite passes.
- [ ] `SECURITY.md`, `README.md`, and `.env.example` updated.

---

## 6. Output format

For each phase, return:
1. A short summary of what changed and why.
2. The list of files created/modified/deleted.
3. New migration files.
4. Test results (and the new tests added).
5. Any assumptions made or breaking changes introduced.

At the very end, produce a **traceability table** mapping each numbered item in this brief (1.1 … 5.3) to the commit(s)/files that resolve it, so completeness can be verified at a glance.
