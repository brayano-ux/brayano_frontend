import { describe, expect, it } from "vitest";
import { getOrganizationBillingStatus, releaseAiResponse, reserveAiResponse } from "./subscription.service.js";

describe("unlimited AI access", () => {
  it("allows responses without reading or decrementing trial or subscription quotas", async () => {
    await expect(reserveAiResponse("org-1")).resolves.toEqual({
      allowed: true,
      source: "unlimited",
      remaining: Number.POSITIVE_INFINITY,
    });
  });

  it("does not consume a quota when an AI response is released", async () => {
    await expect(releaseAiResponse("org-1", {
      allowed: true,
      source: "unlimited",
      remaining: Number.POSITIVE_INFINITY,
    })).resolves.toBeUndefined();
  });

  it("reports active unlimited access regardless of stored billing state", async () => {
    await expect(getOrganizationBillingStatus("org-1")).resolves.toMatchObject({
      plan: "unlimited",
      status: "ACTIVE",
      remainingMessages: Number.POSITIVE_INFINITY,
      responsibleLimit: null,
    });
  });
});
