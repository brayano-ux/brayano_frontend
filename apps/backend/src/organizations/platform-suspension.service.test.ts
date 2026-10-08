import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("../database/client.js", () => ({ prisma: { organization: { findUnique: mocks.findUnique } } }));

import { getPlatformSuspension } from "./platform-suspension.service.js";

describe("getPlatformSuspension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("reports a suspended organization with its reason", async () => {
    const suspendedAt = new Date();
    mocks.findUnique.mockResolvedValue({ platformSuspended: true, suspensionReason: "Impayé", suspendedAt });
    await expect(getPlatformSuspension("org-1")).resolves.toEqual({ suspended: true, reason: "Impayé", suspendedAt });
  });

  it("treats an unknown organization as not suspended", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(getPlatformSuspension("org-1")).resolves.toEqual({ suspended: false, reason: null, suspendedAt: null });
  });

  it("lets the AI answer when the database lookup fails", async () => {
    mocks.findUnique.mockRejectedValue(new Error('column "platform_suspended" does not exist'));
    await expect(getPlatformSuspension("org-1")).resolves.toEqual({ suspended: false, reason: null, suspendedAt: null });
  });
});
