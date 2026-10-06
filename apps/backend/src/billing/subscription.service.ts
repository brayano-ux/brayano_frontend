export type AiResponseEntitlement =
  { allowed: true; source: "unlimited"; remaining: number };

export async function reserveAiResponse(_organizationId: string): Promise<AiResponseEntitlement> {
  return { allowed: true, source: "unlimited", remaining: Number.POSITIVE_INFINITY };
}

export async function releaseAiResponse(_organizationId: string, _reservation: Extract<AiResponseEntitlement, { allowed: true }>) {
  return;
}

export async function getOrganizationBillingStatus(_organizationId: string) {
  return {
    plan: "unlimited",
    status: "ACTIVE",
    remainingMessages: Number.POSITIVE_INFINITY,
    messageLimit: Number.POSITIVE_INFINITY,
    expiresAt: null,
    activeWhatsAppChannels: Number.POSITIVE_INFINITY,
    assistants: Number.POSITIVE_INFINITY,
    responsibleLimit: null,
  };
}
