import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn(), sendEmail: vi.fn() }));
vi.mock("../database/client.js", () => ({
  prisma: { organization: { findUnique: mocks.findUnique, updateMany: mocks.updateMany } },
}));
vi.mock("../notifications/suspension-emails.js", () => ({ sendSuspensionEmail: mocks.sendEmail }));

import { getPlatformSuspension, suspendOrganization, unsuspendOrganization } from "./platform-suspension.service.js";

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

describe("suspension changes and notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.sendEmail.mockResolvedValue(1);
  });

  it("emails the administrators when an organization becomes suspended", async () => {
    mocks.findUnique.mockResolvedValue({ platformSuspended: false });
    await suspendOrganization("org-1", "Impayé");
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "org-1" },
      data: expect.objectContaining({ platformSuspended: true, suspensionReason: "Impayé" }),
    }));
    expect(mocks.sendEmail).toHaveBeenCalledWith("org-1", "suspended", "Impayé");
  });

  it("does not email again when the organization is already suspended", async () => {
    mocks.findUnique.mockResolvedValue({ platformSuspended: true });
    await suspendOrganization("org-1", "Nouveau motif");
    expect(mocks.updateMany).toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("emails the administrators when the suspension is lifted", async () => {
    mocks.findUnique.mockResolvedValue({ platformSuspended: true });
    await unsuspendOrganization("org-1");
    expect(mocks.sendEmail).toHaveBeenCalledWith("org-1", "reactivated", null);
  });

  it("does not email when lifting a suspension that did not exist", async () => {
    mocks.findUnique.mockResolvedValue({ platformSuspended: false });
    await unsuspendOrganization("org-1");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("still succeeds when the email cannot be sent", async () => {
    mocks.findUnique.mockResolvedValue({ platformSuspended: false });
    mocks.sendEmail.mockRejectedValue(new Error("SMTP down"));
    await expect(suspendOrganization("org-1", null)).resolves.toBeUndefined();
  });

  it("rejects an unknown organization", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(suspendOrganization("missing", null)).rejects.toThrow("Entreprise introuvable.");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
