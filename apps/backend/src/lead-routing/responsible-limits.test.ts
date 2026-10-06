import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  responsibleCount: vi.fn(),
  routingSettingsFindUnique: vi.fn(),
  locationFindFirst: vi.fn(),
  responsibleCreate: vi.fn(),
}));

vi.mock("../database/client.js", () => ({
  prisma: {
    responsible: { count: mocks.responsibleCount, create: mocks.responsibleCreate },
    organizationRoutingSettings: { findUnique: mocks.routingSettingsFindUnique },
    location: { findFirst: mocks.locationFindFirst },
  },
}));
import { createResponsible } from "./lead-routing.service.js";

describe("commercial routing without plan limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locationFindFirst.mockResolvedValue({ id: "location-1" });
    mocks.responsibleCreate.mockResolvedValue({ id: "commercial-1" });
    mocks.routingSettingsFindUnique.mockResolvedValue(null);
  });

  it("allows additional commercials without checking a plan limit", async () => {
    await expect(createResponsible("org-1", {
      locationId: "location-1", name: "Commercial 2", whatsappNumber: "+237600000000",
    })).resolves.toEqual({ id: "commercial-1" });
    await expect(createResponsible("org-1", {
      locationId: "location-1", name: "Commercial 3", whatsappNumber: "+237611111111",
    })).resolves.toEqual({ id: "commercial-1" });
    expect(mocks.responsibleCreate).toHaveBeenCalledTimes(2);
    expect(mocks.responsibleCount).not.toHaveBeenCalled();
  });

  it("does not impose plan limits on fallback settings", async () => {
    await expect(createResponsible("org-1", {
      locationId: "location-1", name: "Commercial sans plafond", whatsappNumber: "+237600000000",
    })).resolves.toEqual({ id: "commercial-1" });
    expect(mocks.responsibleCount).not.toHaveBeenCalled();
  });
});
