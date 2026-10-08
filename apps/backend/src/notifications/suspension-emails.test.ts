import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orgFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  sendEmail: vi.fn(),
  env: { SUPPORT_EMAIL: "support@example.com" as string | undefined },
}));
vi.mock("../config/env.js", () => ({ env: mocks.env }));
vi.mock("../database/client.js", () => ({
  prisma: { organization: { findUnique: mocks.orgFindUnique }, user: { findMany: mocks.userFindMany } },
}));
vi.mock("./email.service.js", () => ({ sendEmail: mocks.sendEmail }));

import { sendSuspensionEmail } from "./suspension-emails.js";

describe("sendSuspensionEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.orgFindUnique.mockResolvedValue({ name: "Boutique Zoé" });
    mocks.userFindMany.mockResolvedValue([{ email: "a@example.com" }, { email: "b@example.com" }]);
    mocks.sendEmail.mockResolvedValue(true);
  });

  it("sends the suspension notice with the reason to every administrator", async () => {
    await expect(sendSuspensionEmail("org-1", "suspended", "Impayé")).resolves.toBe(2);
    expect(mocks.userFindMany).toHaveBeenCalledWith({ where: { organizationId: "org-1", role: "ADMIN" }, select: { email: true } });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    const first = mocks.sendEmail.mock.calls[0]![0];
    expect(first.to).toBe("a@example.com");
    expect(first.subject).toMatch(/suspendu/);
    expect(first.text).toContain("Boutique Zoé");
    expect(first.text).toContain("Motif : Impayé");
    expect(first.text).toContain("support@example.com");
  });

  it("sends the reactivation notice", async () => {
    await sendSuspensionEmail("org-1", "reactivated", null);
    expect(mocks.sendEmail.mock.calls[0]![0].subject).toMatch(/de nouveau actif/);
  });

  it("counts only the emails that were really sent and survives a failing recipient", async () => {
    mocks.sendEmail.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(false);
    await expect(sendSuspensionEmail("org-1", "suspended", null)).resolves.toBe(0);
  });

  it("does nothing when there is no administrator or no organization", async () => {
    mocks.userFindMany.mockResolvedValue([]);
    await expect(sendSuspensionEmail("org-1", "suspended", null)).resolves.toBe(0);
    mocks.orgFindUnique.mockResolvedValue(null);
    await expect(sendSuspensionEmail("org-2", "suspended", null)).resolves.toBe(0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
