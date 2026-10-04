import { env } from "../config/env.js";
import { getBillingPlan } from "../billing/billing-plans.js";
import type { BillingPlan } from "../billing/billing-plans.js";

export { getBillingPlan } from "../billing/billing-plans.js";

export function isCampayDemoMode() {
  return new URL(env.CAMPAY_BASE_URL).hostname === "demo.campay.net";
}

export function getCampayChargeAmount(plan: BillingPlan) {
  return isCampayDemoMode() ? env.CAMPAY_DEMO_AMOUNT : plan.amount;
}

type CampayPayload = Record<string, unknown>;

async function requestCampay(path: string, init: RequestInit = {}): Promise<CampayPayload> {
  const baseUrl = env.CAMPAY_BASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}`, init);
  const raw = await response.text();
  let payload: CampayPayload = {};
  try {
    payload = raw ? JSON.parse(raw) as CampayPayload : {};
  } catch {
    payload = { message: raw };
  }
  if (!response.ok) {
    const detail = String(payload.message ?? payload.detail ?? payload.error ?? "Erreur Campay.");
    throw new Error(detail);
  }
  return payload;
}

async function getCampayToken() {
  if (!env.CAMPAY_USERNAME || !env.CAMPAY_PASSWORD) {
    throw new Error("Ajoutez CAMPAY_USERNAME et CAMPAY_PASSWORD dans le .env.");
  }
  const payload = await requestCampay("/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: env.CAMPAY_USERNAME, password: env.CAMPAY_PASSWORD }),
  });
  if (typeof payload.token !== "string" || !payload.token) {
    throw new Error("Campay n'a pas renvoyé de jeton d'accès.");
  }
  return payload.token;
}

export async function createCampayCollection(input: {
  plan: string;
  phone: string;
  email: string;
  externalReference: string;
}) {
  const plan = getBillingPlan(input.plan);
  const chargeAmount = getCampayChargeAmount(plan);
  const token = await getCampayToken();
  const payload = await requestCampay("/collect/", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(chargeAmount),
      currency: env.CAMPAY_CURRENCY,
      from: input.phone.replace(/[\s()+-]/g, ""),
      description: `Brayano AI ${plan.name} - ${plan.messages} messages`,
      external_user: input.email,
      external_reference: input.externalReference,
      callback_url: env.CAMPAY_CALLBACK_URL || `${env.APP_URL.replace(/\/+$/, "")}/billing/campay/callback`,
    }),
  });

  if (typeof payload.reference !== "string" || !payload.reference) {
    throw new Error("Campay n'a pas renvoyé de référence de paiement.");
  }
  return {
    reference: payload.reference,
    externalReference: input.externalReference,
    ussdCode: typeof payload.ussd_code === "string" ? payload.ussd_code : null,
    operator: typeof payload.operator === "string" ? payload.operator : null,
    chargedAmount: chargeAmount,
    currency: env.CAMPAY_CURRENCY,
    demoMode: isCampayDemoMode(),
    status: "PENDING" as const,
    provider: "campay" as const,
    plan,
  };
}

export async function checkCampayPayment(reference: string) {
  const token = await getCampayToken();
  return requestCampay(`/transaction/${encodeURIComponent(reference)}/`, {
    method: "GET",
    headers: { Authorization: `Token ${token}` },
  });
}
