# Campaign Lite — Campaign management platform for freelancers

## Stack
- **Runtime** — Node.js 22, Next.js 15 (App Router)
- **UI** — React 18, Tailwind CSS v4, shadcn/ui (customized), @xyflow/react (workflows)
- **Database** — SQLite dev / Postgres production, Prisma ORM (13 models)
- **Auth** — NextAuth v5 beta (JWT strategy, dev email + Google OAuth)
- **Icons** — lucide-react, Geist font
- **Email** — SMTP (settings UI) or Resend SDK; dev mode simulates sends

## Layout
- `prisma/schema.prisma` — 15 models (added smtpHost/Port/User/Pass, figmaToken to Organization)
- `src/app/(dashboard)/` — campaigns/ contacts/ segments/ templates/ workflows/ settings/ figma/
- `src/app/api/` — 23 route handlers (CRUD + auth + figma + smtp + tracking + seed)
- `src/app/auth/login/` — Login page with dev email + Google OAuth
- `src/components/ui/` — 14 shadcn-style primitives
- `src/components/layout/` — Sidebar + header + dashboard shell
- `src/components/workflow/` — React Flow canvas (7 node types), palette, builder
- `src/lib/` — auth.ts, db.ts, email.ts (SMTP+Resend+dev), figma-to-email.ts, session-utils.ts, workflow-engine.ts, seed-all.ts

## Commands
- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx prisma db push` — Sync schema to SQLite (creates dev.db)
- `npx prisma generate` — Regenerate Prisma Client

## Key Features Built
- **Figma import** — Paste Figma URL (/file/, /proto/, /design/, /community/file/), extracts text + images, converts to HTML email. Template index picker, group name fallback for outlined text
- **SMTP settings** — per-org SMTP config (host, port, auth, from) via Settings UI with nodemailer
- **Workflow engine** — 7 node types (trigger, sendEmail, delay, condition, updateContact, webhook, end), visual builder, execution runner with step logs
- **Campaign sending** — batch send (10 at a time), open/click tracking pixels, unsubscribe handling
- **Seed data** — auto-seeds 8 contacts, 2 templates, 2 campaigns, 2 segments, 2 workflows on first visit

## Conventions
- Server Components by default; "use client" only in leaf interactive components
- Auth via `auth()` + redirect in each page; API routes use `getOrgId(session)` for email-based org lookup (session.user.id is undefined in JWT)
- SQLite arrays stored as JSON strings (tags, variables); parse via JSON.parse() on read
- All modules auto-seed if empty on first visit

## Watch out for
- **session.user.id is undefined** — JWT doesn't persist id; always use session.user.email + getOrgId()
- **Database resets** — deleting dev.db with stale JWT cookie causes redirect loop; login page auto-clears via /api/logout
- **Figma rate limits** — Free Figma API: ~60 req/min. Imports add 500ms delay + auto-retry on 429
- **Figma outlined text** — If text is converted to vectors, GROUP names are used as fallback (no formatting preserved)
- **Port conflicts** — Only one dev server at a time; kill old process before restarting
