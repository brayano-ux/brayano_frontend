import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  responsibleCount: vi.fn(),
  routingSettingsFindUnique: vi.fn(),
  locationFindFirst: vi.fn(),
  responsibleCreate: vi.fn(),
  getBillingStatus: vi.fn(),
}));

vi.mock("../database/client.js", () => ({
  prisma: {
    responsible: { count: mocks.responsibleCount, create: mocks.responsibleCreate },
    organizationRoutingSettings: { findUnique: mocks.routingSettingsFindUnique },
    location: { findFirst: mocks.locationFindFirst },
  },
}));
vi.mock("../billing/subscription.service.js", () => ({ getOrganizationBillingStatus: mocks.getBillingStatus }));

import { createResponsible } from "./lead-routing.service.js";

describe("commercial plan limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locationFindFirst.mockResolvedValue({ id: "location-1" });
    mocks.responsibleCreate.mockResolvedValue({ id: "commercial-1" });
    mocks.routingSettingsFindUnique.mockResolvedValue(null);
  });

  it("blocks a second commercial on Essentiel", async () => {
    mocks.getBillingStatus.mockResolvedValue({ status: "ACTIVE", responsibleLimit: 1 });
    mocks.responsibleCount.mockResolvedValue(1);

    await expect(createResponsible("org-1", {
      locationId: "location-1", name: "Commercial 2", whatsappNumber: "+237600000000",
    })).rejects.toMatchObject({ statusCode: 402, code: "RESPONSIBLE_LIMIT_REACHED" });
    expect(mocks.responsibleCreate).not.toHaveBeenCalled();
  });

  it("allows three commercials on Pro and rejects a fourth", async () => {
    mocks.getBillingStatus.mockResolvedValue({ status: "ACTIVE", responsibleLimit: 3 });
    mocks.responsibleCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    await expect(createResponsible("org-1", {
      locationId: "location-1", name: "Commercial 3", whatsappNumber: "+237600000000",
    })).resolves.toEqual({ id: "commercial-1" });
    await expect(createResponsible("org-1", {
      locationId: "location-1", name: "Commercial 4", whatsappNumber: "+237611111111",
    })).rejects.toMatchObject({ statusCode: 402, code: "RESPONSIBLE_LIMIT_REACHED" });
  });

  it("allows additional commercials on Business", async () => {
    mocks.getBillingStatus.mockResolvedValue({ status: "ACTIVE", responsibleLimit: null });

    await expect(createResponsible("org-1", {
      locationId: "location-1", name: "Commercial 11", whatsappNumber: "+237600000000",
    })).resolves.toEqual({ id: "commercial-1" });
    expect(mocks.responsibleCount).not.toHaveBeenCalled();
  });
});
