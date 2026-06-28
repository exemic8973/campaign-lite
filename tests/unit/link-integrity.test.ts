import { test, expect } from "@playwright/test";
import { signLink, verifyLink } from "../../src/lib/link-signing";

test.describe("Signed link integrity (A1)", () => {
  const testContactId = "contact-link-test-1";
  const testCampaignId = "campaign-link-test-1";

  test("unsubscribe link generates valid signed token", () => {
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "unsubscribe" });
    expect(token).toBeTruthy();
    expect(token).toContain(".");

    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
    expect(payload!.purpose).toBe("unsubscribe");
    expect(payload!.contactId).toBe(testContactId);
    expect(payload!.campaignId).toBe(testCampaignId);
  });

  test("tracking link generates valid signed token", () => {
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "track" });
    expect(token).toBeTruthy();
    expect(token).toContain(".");

    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
    expect(payload!.purpose).toBe("track");
    expect(payload!.contactId).toBe(testContactId);
    expect(payload!.campaignId).toBe(testCampaignId);
  });

  test("tampered unsubscribe token is rejected", () => {
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "unsubscribe" });
    const [encoded] = token.split(".");
    // Tamper the encoded payload
    const decoded = Buffer.from(encoded, "base64url").toString();
    const tampered = decoded.replace(testContactId, "evil-contact");
    const tamperedEncoded = Buffer.from(tampered).toString("base64url");
    const [, hmac] = token.split(".");
    const badToken = `${tamperedEncoded}.${hmac}`;

    expect(verifyLink(badToken)).toBeNull();
  });

  test("tampered track token is rejected", () => {
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "track" });
    const [encoded] = token.split(".");
    const decoded = Buffer.from(encoded, "base64url").toString();
    const tampered = decoded.replace("track", "unsubscribe");
    const tamperedEncoded = Buffer.from(tampered).toString("base64url");
    const [, hmac] = token.split(".");
    const badToken = `${tamperedEncoded}.${hmac}`;

    expect(verifyLink(badToken)).toBeNull();
  });

  test("token is purpose-scoped (unsubscribe token fails track purpose)", () => {
    const token = signLink({ contactId: testContactId, campaignId: testCampaignId, purpose: "unsubscribe" });
    const payload = verifyLink(token);
    expect(payload).not.toBeNull();
    expect(payload!.purpose).toBe("unsubscribe");
    // It should NOT be accepted as a track token
    expect(payload!.purpose).not.toBe("track");
  });

  test("tokens for different contacts are distinct", () => {
    const token1 = signLink({ contactId: "contact-A", campaignId: testCampaignId, purpose: "unsubscribe" });
    const token2 = signLink({ contactId: "contact-B", campaignId: testCampaignId, purpose: "unsubscribe" });
    expect(token1).not.toBe(token2);

    const p1 = verifyLink(token1);
    const p2 = verifyLink(token2);
    expect(p1!.contactId).toBe("contact-A");
    expect(p2!.contactId).toBe("contact-B");
  });
});
