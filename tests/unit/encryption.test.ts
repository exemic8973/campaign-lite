import { test, expect } from "@playwright/test";

/**
 * Set a deterministic encryption key for testing.
 * Must be set before the import, but since Node caches modules,
 * we rely on the fallback key derivation (no ENCRYPTION_KEY set).
 */

// Dynamic import after setting env is difficult with ESM.
// The module's fallback derives KEY from AUTH_SECRET (or a dev default),
// so these tests work without ENCRYPTION_KEY set.
import { encrypt, decrypt } from "../../src/lib/encryption";

test.describe("encryption round-trip", () => {
  test("encrypts and decrypts a simple string", () => {
    const original = "hello world";
    const encrypted = encrypt(original);
    expect(encrypted).toBeTruthy();
    // Format: iv:tag:ciphertext (three base64 parts)
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test("encrypts and decrypts an empty string", () => {
    const original = "";
    const encrypted = encrypt(original);
    expect(encrypted).toBeTruthy();

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test("encrypts and decrypts special characters", () => {
    const original = 'Special: <> & " \' /\\n\\t 中文 español 😀';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test("encrypts and decrypts a long string", () => {
    const original = "A".repeat(10000);
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test("produces unique ciphertexts each time (different IV)", () => {
    const original = "same text";
    const encrypted1 = encrypt(original);
    const encrypted2 = encrypt(original);
    // Two encryptions of the same plaintext should differ (random IV)
    expect(encrypted1).not.toBe(encrypted2);
    // Both should decrypt back to the same value
    expect(decrypt(encrypted1)).toBe(original);
    expect(decrypt(encrypted2)).toBe(original);
  });
});

test.describe("encryption tamper detection", () => {
  test("returns null for tampered ciphertext", () => {
    const original = "secret value";
    const encrypted = encrypt(original);

    // Tamper with the data portion
    const parts = encrypted.split(":");
    const tamperedData = Buffer.from(parts[2], "base64");
    tamperedData[0] ^= 0xff; // flip bits in first byte
    parts[2] = tamperedData.toString("base64");
    const tampered = parts.join(":");

    const result = decrypt(tampered);
    expect(result).toBeNull();
  });

  test("returns null for tampered IV", () => {
    const original = "secret value";
    const encrypted = encrypt(original);

    const parts = encrypted.split(":");
    const tamperedIv = Buffer.from(parts[0], "base64");
    tamperedIv[0] ^= 0xff;
    parts[0] = tamperedIv.toString("base64");
    const tampered = parts.join(":");

    const result = decrypt(tampered);
    expect(result).toBeNull();
  });

  test("returns null for tampered auth tag", () => {
    const original = "secret value";
    const encrypted = encrypt(original);

    const parts = encrypted.split(":");
    const tamperedTag = Buffer.from(parts[1], "base64");
    tamperedTag[0] ^= 0xff;
    parts[1] = tamperedTag.toString("base64");
    const tampered = parts.join(":");

    const result = decrypt(tampered);
    expect(result).toBeNull();
  });

  test("returns null for malformed input", () => {
    expect(decrypt("")).toBeNull();
    expect(decrypt("not-a-valid-format")).toBeNull();
    expect(decrypt("a:b")).toBeNull(); // missing ciphertext
    expect(decrypt("a:b:c:d")).toBeNull(); // too many parts
  });

  test("returns null for garbage base64", () => {
    expect(decrypt("!!!:!!!:!!!")).toBeNull();
  });
});
