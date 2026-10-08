import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  suspend: vi.fn(),
  unsuspend: vi.fn(),
  list: vi.fn(),
  env: { PLATFORM_ADMIN_TOKEN: "t".repeat(40) as string | undefined },
}));

vi.mock("../config/env.js", () => ({ env: mocks.env }));
vi.mock("../organizations/platform-suspension.service.js", () => ({
  suspendOrganization: mocks.suspend,
  unsuspendOrganization: mocks.unsuspend,
  listOrganizationsForAdmin: mocks.list,
}));

import { adminRoute } from "./admin.route.js";

const auth = { authorization: `Bearer ${"t".repeat(40)}` };

async function buildApp() {
  const app = Fastify();
  await app.register(adminRoute);
  return app;
}

describe("platform admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.PLATFORM_ADMIN_TOKEN = "t".repeat(40);
  });

  it("rejects requests without the platform token", async () => {
    const app = await buildApp();
    const none = await app.inject({ method: "POST", url: "/admin/organizations/org-1/suspend" });
    const wrong = await app.inject({ method: "POST", url: "/admin/organizations/org-1/suspend", headers: { authorization: "Bearer nope" } });
    expect(none.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(mocks.suspend).not.toHaveBeenCalled();
  });

  it("is disabled when no token is configured", async () => {
    mocks.env.PLATFORM_ADMIN_TOKEN = undefined;
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/admin/organizations", headers: auth });
    expect(response.statusCode).toBe(503);
  });

  it("suspends and unsuspends an organization", async () => {
    const app = await buildApp();
    const suspended = await app.inject({
      method: "POST", url: "/admin/organizations/org-1/suspend", headers: auth, payload: { reason: "Impayé" },
    });
    expect(suspended.statusCode).toBe(200);
    expect(mocks.suspend).toHaveBeenCalledWith("org-1", "Impayé");

    const restored = await app.inject({ method: "POST", url: "/admin/organizations/org-1/unsuspend", headers: auth });
    expect(restored.statusCode).toBe(200);
    expect(mocks.unsuspend).toHaveBeenCalledWith("org-1");
  });

  it("lists organizations", async () => {
    mocks.list.mockResolvedValue([{ id: "org-1", platformSuspended: true }]);
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/admin/organizations", headers: auth });
    expect(JSON.parse(response.payload)).toEqual({ organizations: [{ id: "org-1", platformSuspended: true }] });
  });
});
