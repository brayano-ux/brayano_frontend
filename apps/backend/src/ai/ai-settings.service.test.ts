import { describe, expect, it } from "vitest";
import { resolveResponseDelaySeconds } from "./ai-settings.service.js";
import { aiReplySchema } from "./schemas.js";

describe("resolveResponseDelaySeconds", () => {
  it("defaults to 3 seconds", () => {
    expect(resolveResponseDelaySeconds(undefined)).toBe(3);
    expect(resolveResponseDelaySeconds(3)).toBe(3);
    expect(resolveResponseDelaySeconds(4)).toBe(3);
  });

  it("accepts 5 and 7 seconds", () => {
    expect(resolveResponseDelaySeconds(5)).toBe(5);
    expect(resolveResponseDelaySeconds(7)).toBe(7);
  });
});

describe("aiReplySchema", () => {
  it("keeps an optional image URL for outbound media", () => {
    const parsed = aiReplySchema.safeParse({
      reply: "Bonjour",
      intent: "demande_information",
      confidence: 0.8,
      needsHuman: false,
      leadScore: 35,
      qualificationStatus: "qualifying",
      nextAction: "continue",
      leadData: { city: "Douala" },
      imageUrl: "https://example.com/promo.png",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.imageUrl).toBe("https://example.com/promo.png");
  });
});
