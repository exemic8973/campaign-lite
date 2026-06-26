import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = (() => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // Fallback: use AUTH_SECRET or a fixed dev key (produces warning)
    if (process.env.NODE_ENV === "production") {
      console.warn("ENCRYPTION_KEY not set - secrets cannot be encrypted at rest");
    }
    // Derive 32 bytes from available secrets for dev compatibility
    const base = (process.env.AUTH_SECRET || "dev-fallback-32-bytes-key!!") + "encryption-salt";
    return Buffer.from(require("crypto").createHash("sha256").update(base).digest()).slice(0, 32);
  }
  return Buffer.from(key, "base64");
})();

/**
 * Encrypt `plaintext` → "iv:tag:ciphertext" (all base64-encoded).
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt "iv:tag:ciphertext" → plaintext. Returns null on failure.
 */
export function decrypt(ciphertext: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = ciphertext.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
