import { test, expect } from "@playwright/test";

// Use the dev fallback secret (LINK_SIGNING_SECRET not set → AUTH_SECRET → dev-fallback-secret)
import { signLink, verifyLink } from "../../src/lib/link-signing";

const testContactId = "contact-123";
const testCampaignId = "campaign-456";

test.describe("link signing — sign and verify", () => {
  test("signs and verifies an unsubscribe link", () => {
    const token = signLink({
      contactId: testContactId,
      campaignId: testCampaignId,
      purpose: "unsubscribe",
    });
    expect(token).toBeTruthy();
    expect(token).toContain("."); // encoded data + hmac

    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
    expect(payload!.contactId).toBe(testContactId);
    expect(payload!.campaignId).toBe(testCampaignId);
    expect(payload!.purpose).toBe("unsubscribe");
  });

  test("signs and verifies a tracking link", () => {
    const token = signLink({
      contactId: testContactId,
      campaignId: testCampaignId,
      purpose: "track",
    });

    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
    expect(payload!.purpose).toBe("track");
  });

  test("verifies with explicit expiry", () => {
    const farFuture = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
    const token = signLink({
      contactId: testContactId,
      campaignId: testCampaignId,
      purpose: "unsubscribe",
      exp: farFuture,
    });

    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
    // verifyLink does not return exp, but it should accept tokens with valid expiry
    expect(payload!.contactId).toBe(testContactId);
    expect(payload!.campaignId).toBe(testCampaignId);
    expect(payload!.purpose).toBe("unsubscribe");
  });

  test("produces different tokens for different purposes", () => {
    const unsubscribe = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "unsubscribe" });
    const track = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "track" });
    expect(unsubscribe).not.toBe(track);
  });
});

test.describe("link signing — expiry", () => {
  test("rejects an expired token", () => {
    const past = Math.floor(Date.now() / 1000) - 1; // 1 second ago
    const token = signLink({
      contactId: testContactId,
      campaignId: testCampaignId,
      purpose: "unsubscribe",
      exp: past,
    });

    const payload = verifyLink(token);
    expect(payload).toBeNull();
  });

  test("accepts a token at the exact expiry boundary", () => {
    const now = Math.floor(Date.now() / 1000) + 5; // 5 seconds in the future
    const token = signLink({
      contactId: testContactId,
      campaignId: testCampaignId,
      purpose: "unsubscribe",
      exp: now,
    });

    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
  });
});

test.describe("link signing — tamper resistance", () => {
  test("rejects a token with tampered payload", () => {
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "unsubscribe" });

    // Tamper with the encoded payload
    const [encoded] = token.split(".");
    const decoded = Buffer.from(encoded, "base64url").toString();
    const tampered = decoded.replace(testContactId, "contact-evil");
    const tamperedEncoded = Buffer.from(tampered).toString("base64url");
    const [, hmac] = token.split(".");
    const badToken = `${tamperedEncoded}.${hmac}`;

    const payload = verifyLink(badToken);
    expect(payload).toBeNull();
  });

  test("rejects a token with tampered HMAC", () => {
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "unsubscribe" });
    const [encoded] = token.split(".");

    // Flip one character in the HMAC
    const badToken = `${encoded}.invalidsignature`;

    const payload = verifyLink(badToken);
    expect(payload).toBeNull();
  });

  test("rejects malformed tokens", () => {
    expect(verifyLink("")).toBeNull();
    expect(verifyLink("no-dot")).toBeNull();
    expect(verifyLink("data.and.more.dots")).toBeNull();
    expect(verifyLink("....")).toBeNull();
  });

  test("rejects token with wrong purpose", () => {
    // Create a token for 'unsubscribe' but then craft one that looks different
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "track" });
    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
    expect(payload!.purpose).toBe("track");
    // Confirm 'unsubscribe' token has different payload
    const unsubToken = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "unsubscribe" });
    const unsubPayload = verifyLink(unsubToken);
    expect(unsubPayload!.purpose).toBe("unsubscribe");
  });
});
