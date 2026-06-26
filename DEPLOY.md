# Deploying to Zeabur

## Prerequisites
- Zeabur account with API token
- Zeabur MCP server configured in `.reasonix/config.json`
- Project pushed to GitHub: https://github.com/exemic8973/campaign-lite

## Zeabur Setup Commands

Once the Zeabur MCP is active, ask your AI:

```
"Deploy campaign-lite from github.com/exemic8973/campaign-lite to Zeabur"
```

The MCP will auto-detect:
- **Framework:** Next.js 15 (build command: `npm run build`, start: `npm start`)
- **Port:** 3000
- **Runtime:** Node.js 22

## Required Services

| Service | Purpose | Plan |
|---|---|---|
| **PostgreSQL** | Database (replaces SQLite) | 1GB starter |
| **Redis** | BullMQ queue for email sending | 256MB |

## Environment Variables

```
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/campaign_lite

# Auth
AUTH_SECRET=generate-a-random-32-char-string
AUTH_URL=https://your-domain.zeabur.app

# Google OAuth (optional)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Email (at least ONE required)
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=

# Security
ENCRYPTION_KEY=generate-with-openssl-rand-base64-32
LINK_SIGNING_SECRET=any-random-string
RESEND_WEBHOOK_SECRET=

# Queue
REDIS_HOST=[redis-host]
REDIS_PORT=6379
```

## Deployment Steps (via MCP)

1. **Create project** — "Create a new project called campaign-lite"
2. **Add PostgreSQL** — "Add a Postgres service to the project"
3. **Add Redis** — "Add a Redis service to the project"
4. **Deploy from GitHub** — "Deploy github.com/exemic8973/campaign-lite"  
5. **Set env vars** — "Update environment variables for campaign-lite"
6. **Bind domain** — "Bind a zeabur.app subdomain to campaign-lite"

## Post-Deploy

After first deploy, run the database migration:
```
"Run npx prisma db push on the campaign-lite service"
```

Then visit `https://your-domain.zeabur.app/auth/login` and log in with any email.
