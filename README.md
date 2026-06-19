# Campaign Lite

Modern campaign management platform for freelancers. Replace Adobe Campaign Standard with a compact, 2026-styled UI.

## Stack

- **Next.js 15** (App Router) + **React 18**
- **Tailwind CSS v4** + **shadcn/ui** (custom Taste Skill palette)
- **Prisma ORM** — SQLite (dev) / Postgres (production)
- **NextAuth v5** — JWT auth with Google OAuth + dev email login
- **Resend** / **SMTP** — dual email sending support
- **@xyflow/react** — visual workflow builder
- **Lucide React** icons + **Geist** font

## Quick Start

```bash
# Install
npm install

# Set up database (SQLite for dev)
npx prisma db push

# Start dev server
npm run dev
# → http://localhost:3000
```

Login with any email (dev mode creates Org + User automatically).

## Features

### Contacts
- CRUD with search, pagination, tags
- CSV import
- Subscription management

### Segments
- Rule-based builder (AND/OR conditions)
- Contact count preview
- Multiple field operators

### Campaigns
- 3-step create wizard (details → content/audience → review)
- Send via SMTP or Resend
- Open/click tracking
- Status management (draft → sending → sent)

### Templates
- HTML editor with `{{variable}}` personalization
- Live preview toggle (Code / Preview)
- **Figma import**: paste any Figma URL → auto-converts to responsive email HTML
  - Supports `/file/`, `/proto/`, `/design/`, `/community/file/` URLs
  - Image extraction via Figma API
  - Group name fallback for outlined text
  - Template index picker for multi-template files

### Workflows
- Visual drag-and-drop builder (React Flow)
- 7 node types: Trigger, Send Email, Delay, Condition, Update Contact, Webhook, End
- Execution engine with step tracking
- Condition branching (yes/no paths)

### Settings
- Organization management
- Figma API token (stored per-org)
- SMTP configuration (host, port, auth)
- Resend API key fallback

### Seed Data
Auto-seeded on first visit: 8 contacts, 2 templates, 2 campaigns, 2 segments, 2 demo workflows.

## Environment

```env
DATABASE_URL="file:./dev.db"              # SQLite dev / postgresql://... for prod
AUTH_SECRET="random-string-32-chars-min"
AUTH_GOOGLE_ID=""                         # Google OAuth (optional)
AUTH_GOOGLE_SECRET=""                     # Google OAuth (optional)
RESEND_API_KEY=""                         # Resend (fallback email)
RESEND_FROM_EMAIL="noreply@campaignlite.dev"
FIGMA_ACCESS_TOKEN=""                     # Optional, can set in Settings UI
```

## Deployment

```bash
npm run build
npm start
```

For production, swap SQLite for Postgres in `.env` and `prisma/schema.prisma`.
