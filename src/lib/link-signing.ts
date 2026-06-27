import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.LINK_SIGNING_SECRET || process.env.AUTH_SECRET || "dev-fallback-secret";
const ALGORITHM = "sha256";

interface LinkPayload {
  contactId?: string;
  campaignId?: string;
  orgId?: string;
  email?: string;
  purpose: "unsubscribe" | "track" | "approve";
  exp?: number; // UNIX timestamp, 30d default
}

/**
 * Sign a payload for use in public links (unsubscribe, tracking).
 * Returns a base64-encoded token.
 */
export function signLink(payload: LinkPayload): string {
  const obj: Record<string, unknown> = {
    p: payload.purpose,
    exp: payload.exp || Math.floor(Date.now() / 1000) + 30 * 86400, // 30d expiry
  };
  if (payload.contactId) obj.cid = payload.contactId;
  if (payload.campaignId) obj.caid = payload.campaignId;
  if (payload.orgId) obj.oid = payload.orgId;
  if (payload.email) obj.em = payload.email;
  const data = JSON.stringify(obj);
  const hmac = createHmac(ALGORITHM, SECRET).update(data).digest("base64url");
  const encoded = Buffer.from(data).toString("base64url");
  return `${encoded}.${hmac}`;
}

/**
 * Verify a signed token. Returns the payload if valid, null otherwise.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyLink(token: string): LinkPayload | null {
  try {
    const [encoded, hmac] = token.split(".");
    if (!encoded || !hmac) return null;

    const expected = createHmac(ALGORITHM, SECRET).update(Buffer.from(encoded, "base64url").toString()).digest("base64url");

    // Constant-time comparison
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(hmac);
    if (expectedBuf.length !== receivedBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, receivedBuf)) return null;

    const data = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (!data.p) return null;

    // Check expiry
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      contactId: data.cid || "",
      campaignId: data.caid || "",
      orgId: data.oid || "",
      email: data.em || "",
      purpose: data.p,
    };
  } catch {
    return null;
  }
}
