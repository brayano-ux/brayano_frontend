import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptionFindUnique: vi.fn(),
  subscriptionUpdateMany: vi.fn(),
  organizationUpdateMany: vi.fn(),
  organizationFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  sendTrialUpgradeEmail: vi.fn(),
}));

vi.mock("../database/client.js", () => ({
  prisma: {
    billingSubscription: { findUnique: mocks.subscriptionFindUnique, updateMany: mocks.subscriptionUpdateMany },
    organization: { updateMany: mocks.organizationUpdateMany, findUnique: mocks.organizationFindUnique },
    user: { findFirst: mocks.userFindFirst },
  },
}));
vi.mock("../notifications/email.service.js", () => ({ sendTrialUpgradeEmail: mocks.sendTrialUpgradeEmail }));

import { getOrganizationBillingStatus, notifyTrialUpgradeEmail, releaseAiResponse, reserveAiResponse } from "./subscription.service.js";

describe("billing entitlements", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("decrements the last free credit and emails only when that response is delivered", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    mocks.organizationUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    mocks.organizationFindUnique.mockResolvedValue({ freeAiResponsesRemaining: 0, trialUpgradeEmailSentAt: null });
    mocks.userFindFirst.mockResolvedValue({ email: "owner@example.com" });
    mocks.sendTrialUpgradeEmail.mockResolvedValue(true);

    const reservation = await reserveAiResponse("org-1");
    expect(reservation).toEqual({ allowed: true, source: "trial", remaining: 0 });
    expect(mocks.sendTrialUpgradeEmail).not.toHaveBeenCalled();
    await notifyTrialUpgradeEmail("org-1");
    expect(mocks.organizationUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: "org-1", freeAiResponsesRemaining: { gt: 0 } },
      data: { freeAiResponsesRemaining: { decrement: 1 } },
    }));
    expect(mocks.sendTrialUpgradeEmail).toHaveBeenCalledWith("owner@example.com");
  });

  it("denies AI when the free trial is exhausted", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    mocks.organizationUpdateMany.mockResolvedValue({ count: 0 });
    mocks.organizationFindUnique.mockResolvedValue({ freeAiResponsesRemaining: 0, trialUpgradeEmailSentAt: null });
    await expect(reserveAiResponse("org-1")).resolves.toEqual({ allowed: false, reason: "trial_exhausted" });
  });

  it("restores a reserved trial credit when the AI response is not delivered", async () => {
    await releaseAiResponse("org-1", { allowed: true, source: "trial", remaining: 14 });
    expect(mocks.organizationUpdateMany).toHaveBeenCalledWith({
      where: { id: "org-1", freeAiResponsesRemaining: { lt: 15 } },
      data: { freeAiResponsesRemaining: { increment: 1 } },
    });
  });

  it("denies AI after the paid subscription expires", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({ status: "ACTIVE", expiresAt: new Date(Date.now() - 1) });
    await expect(reserveAiResponse("org-1")).resolves.toEqual({ allowed: false, reason: "subscription_expired" });
  });

  it("denies paid AI replies after the monthly response allowance is consumed", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({
      id: "subscription-1",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 1000),
      periodStartedAt: new Date(),
      messagesUsed: 5000,
      messageLimit: 5000,
    });
    mocks.subscriptionUpdateMany.mockResolvedValue({ count: 0 });
    await expect(reserveAiResponse("org-1")).resolves.toEqual({ allowed: false, reason: "message_quota_exhausted" });
  });

  it("reports the remaining quota and plan caps", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({
      plan: "pro",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 1000),
      periodStartedAt: new Date(),
      messagesUsed: 1200,
    });
    mocks.organizationFindUnique.mockResolvedValue(null);
    await expect(getOrganizationBillingStatus("org-1")).resolves.toMatchObject({
      plan: "pro", status: "ACTIVE", remainingMessages: 3800, responsibleLimit: 3,
    });
  });
});
