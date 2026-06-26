# Security Policy

## Reporting a Vulnerability

Email [your-email] or open a private security advisory on GitHub.

## Authentication

- **Production:** Only Google OAuth (and optionally an email magic-link provider) is available.
- **Development:** A dev credentials provider allows passwordless login with any email. It is **automatically disabled** when `NODE_ENV=production`.
- All sessions use JWT tokens (NextAuth v5). The JWT callback sets `token.id` for every provider.

## Tenant Isolation

Every authenticated API request resolves the user's `Organization` via `getOrgId(session)` in `src/lib/session-utils.ts`. All CRUD operations are scoped by `organizationId`:

- **Reads:** `findFirst({ where: { id, organizationId: orgId } })` — returns 404 if the record belongs to another org.
- **Writes:** `deleteMany({ where: { id, organizationId: orgId } })` — if `count === 0`, returns 404.

This pattern is enforced in every route handler. IDs cannot be enumerated to access another tenant's data (IDOR protection).

## Email Links

Unsubscribe and open-tracking links are HMAC-SHA256 signed (`src/lib/link-signing.ts`). Tokens are purpose-scoped, time-limited (30 days), and verified with constant-time comparison. Unsigned links are still accepted for backward compatibility but logged.

## Webhooks

Inbound webhooks (`/api/webhooks/email`) verify the provider signature before any database write. Campaign and contact resolution is scoped by the authenticated organization.

## Secrets

- SMTP passwords and Figma tokens are encrypted at rest with AES-256-GCM (`src/lib/encryption.ts`). The key is read from `ENCRYPTION_KEY` environment variable.
- SMTP configuration is per-send (no shared module-level state). Each send builds a fresh transporter.
- No secrets are committed to the repository (`.env` is in `.gitignore`).

## Rate Limiting

Public endpoints (`/api/webhooks/email`, `/api/unsubscribe`, `/api/track/open`) have in-memory rate limiting. For production, replace with `@upstash/ratelimit`.

## Recommended Production Setup

```env
ENCRYPTION_KEY=<32-byte base64>
LINK_SIGNING_SECRET=<random string>
RESEND_WEBHOOK_SECRET=<from Resend dashboard>
NODE_ENV=production
```

See `.env.example` for all required variables.
