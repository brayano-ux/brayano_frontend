import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../database/client.js";
import { env } from "../config/env.js";

const fetchMock = vi.fn();
const prismaMock = prisma as any;
const transactionMock = vi.hoisted(() => ({
  paymentUpdateMany: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  subscriptionUpsert: vi.fn(),
}));

vi.mock("../database/client.js", () => ({
  prisma: {
    billingPayment: {
      create: vi.fn(async () => ({ id: "payment-1" })),
      update: vi.fn(async () => ({})),
      findFirst: vi.fn(),
    },
    billingSubscription: { upsert: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (callback) => callback({
      billingPayment: { updateMany: transactionMock.paymentUpdateMany },
      billingSubscription: {
        findUnique: transactionMock.subscriptionFindUnique,
        upsert: transactionMock.subscriptionUpsert,
      },
    })),
  },
}));

vi.mock("../config/env.js", () => ({
  env: {
    PAYMENT_PROVIDER: "campay",
    CAMPAY_BASE_URL: "https://demo.campay.net/api",
    CAMPAY_USERNAME: "test-user",
    CAMPAY_PASSWORD: "test-password",
    CAMPAY_CURRENCY: "XAF",
    CAMPAY_DEMO_AMOUNT: 25,
    CAMPAY_CALLBACK_URL: "https://app.example.com/billing/campay/callback",
    APP_URL: "https://app.example.com",
  },
}));

vi.mock("./auth.route.js", () => ({
  requireAuth: vi.fn(async () => ({ email: "client@example.com", organizationId: "org-1" })),
}));

describe("billing checkout route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    env.CAMPAY_BASE_URL = "https://demo.campay.net/api";
    transactionMock.paymentUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    transactionMock.subscriptionFindUnique.mockReset().mockResolvedValue(null);
    transactionMock.subscriptionUpsert.mockReset().mockResolvedValue({});
  });

  it("creates a Campay collection request using env-configured credentials", async () => {
    const app = Fastify();
    const { billingRoute } = await import("./billing.route.js");
    await app.register(billingRoute);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ token: "campay-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ reference: "campay-ref-123", ussd_code: "*126#" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const response = await app.inject({
      method: "POST",
      url: "/billing/create-checkout",
      payload: { plan: "pro", email: "client@example.com", phone: "237690000000" },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toMatchObject({
      reference: "campay-ref-123",
      ussdCode: "*126#",
      chargedAmount: 25,
      currency: "XAF",
      demoMode: true,
      status: "PENDING",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/collect/");
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toMatchObject({
      amount: "25",
      currency: "XAF",
    });
    expect(prismaMock.billingPayment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 25, currency: "XAF" }),
    }));

    vi.unstubAllGlobals();
  });

  it("activates the subscription only after Campay confirms amount and currency", async () => {
    env.CAMPAY_BASE_URL = "https://www.campay.net/api";
    const app = Fastify();
    const { billingRoute } = await import("./billing.route.js");
    await app.register(billingRoute);

    prismaMock.billingPayment.findFirst.mockResolvedValue({
      id: "payment-1",
      organizationId: "org-1",
      providerReference: "campay-ref-123",
      plan: "pro",
      amount: 20000,
      currency: "XAF",
      status: "PENDING",
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ token: "campay-token" }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ status: "SUCCESS", amount: "20000", currency: "XAF" }) });
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.inject({
      method: "POST",
      url: "/billing/campay/callback",
      payload: { reference: "campay-ref-123" },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toMatchObject({ received: true, status: "SUCCESS" });
    expect(transactionMock.paymentUpdateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: "PENDING" },
      data: { status: "SUCCESS" },
    });
    expect(transactionMock.subscriptionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1" },
      create: expect.objectContaining({ plan: "pro", messageLimit: 5000, status: "ACTIVE" }),
    }));

    vi.unstubAllGlobals();
  });

  it("does not activate a real subscription after a demo payment", async () => {
    const app = Fastify();
    const { billingRoute } = await import("./billing.route.js");
    await app.register(billingRoute);

    prismaMock.billingPayment.findFirst.mockResolvedValue({
      id: "payment-demo",
      organizationId: "org-1",
      providerReference: "campay-demo-ref",
      plan: "pro",
      amount: 25,
      currency: "XAF",
      status: "PENDING",
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ token: "campay-token" }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ status: "SUCCESS", amount: "25", currency: "XAF" }) });
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.inject({
      method: "POST",
      url: "/billing/campay/callback",
      payload: { reference: "campay-demo-ref" },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toMatchObject({ received: true, status: "SUCCESS" });
    expect(transactionMock.paymentUpdateMany).toHaveBeenCalledWith({
      where: { id: "payment-demo", status: "PENDING" },
      data: { status: "SUCCESS" },
    });
    expect(transactionMock.subscriptionUpsert).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
