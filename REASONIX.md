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
