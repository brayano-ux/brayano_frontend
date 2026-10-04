import { prisma } from "../database/client.js";
import { sendTrialUpgradeEmail } from "../notifications/email.service.js";
import { getBillingPlan } from "./billing-plans.js";

const BILLING_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

async function sendUpgradeEmailOnce(organizationId: string, now: Date) {
  const claimed = await prisma.organization.updateMany({
    where: { id: organizationId, freeAiResponsesRemaining: 0, trialUpgradeEmailSentAt: null },
    data: { trialUpgradeEmailSentAt: now },
  });
  if (claimed.count === 0) return;

  try {
    const owner = await prisma.user.findFirst({
      where: { organizationId, role: "ADMIN" },
      select: { email: true },
    });
    const sent = owner ? await sendTrialUpgradeEmail(owner.email) : false;
    if (!sent) {
      await prisma.organization.updateMany({
        where: { id: organizationId, trialUpgradeEmailSentAt: now },
        data: { trialUpgradeEmailSentAt: null },
      });
    }
  } catch (error) {
    await prisma.organization.updateMany({
      where: { id: organizationId, trialUpgradeEmailSentAt: now },
      data: { trialUpgradeEmailSentAt: null },
    });
    console.error("Échec de l'email de conversion de l'essai gratuit :", error);
  }
}

export type AiResponseEntitlement =
  | { allowed: true; source: "trial"; remaining: number }
  | { allowed: true; source: "subscription"; remaining: number; periodStartedAt: Date }
  | { allowed: false; reason: "trial_exhausted" | "subscription_expired" | "message_quota_exhausted" };

export async function reserveAiResponse(organizationId: string): Promise<AiResponseEntitlement> {
  const subscription = await prisma.billingSubscription.findUnique({ where: { organizationId } });
  const now = new Date();

  if (subscription) {
    if (subscription.status !== "ACTIVE" || subscription.expiresAt <= now) {
      return { allowed: false, reason: "subscription_expired" };
    }

    let current = subscription;
    if (now.getTime() - current.periodStartedAt.getTime() >= BILLING_PERIOD_MS) {
      const elapsedPeriods = Math.floor((now.getTime() - current.periodStartedAt.getTime()) / BILLING_PERIOD_MS);
      const nextPeriodStart = new Date(current.periodStartedAt.getTime() + elapsedPeriods * BILLING_PERIOD_MS);
      await prisma.billingSubscription.updateMany({
        where: {
          id: current.id,
          periodStartedAt: current.periodStartedAt,
        },
        data: { periodStartedAt: nextPeriodStart, messagesUsed: 0 },
      });
      current = await prisma.billingSubscription.findUnique({ where: { organizationId } }) ?? current;
    }

    const consumed = await prisma.billingSubscription.updateMany({
      where: {
        id: current.id,
        status: "ACTIVE",
        expiresAt: { gt: now },
        periodStartedAt: current.periodStartedAt,
        messagesUsed: { lt: current.messageLimit },
      },
      data: { messagesUsed: { increment: 1 } },
    });
    if (consumed.count === 0) {
      return { allowed: false, reason: current.messagesUsed >= current.messageLimit ? "message_quota_exhausted" : "subscription_expired" };
    }

    return {
      allowed: true,
      source: "subscription",
      remaining: current.messageLimit - current.messagesUsed - 1,
      periodStartedAt: current.periodStartedAt,
    };
  }

  const consumed = await prisma.organization.updateMany({
    where: { id: organizationId, freeAiResponsesRemaining: { gt: 0 } },
    data: { freeAiResponsesRemaining: { decrement: 1 } },
  });
  if (consumed.count === 0) {
    await notifyTrialUpgradeEmail(organizationId);
    return { allowed: false, reason: "trial_exhausted" };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { freeAiResponsesRemaining: true, trialUpgradeEmailSentAt: true },
  });
  const remaining = organization?.freeAiResponsesRemaining ?? 0;

  return { allowed: true, source: "trial", remaining };
}

export async function releaseAiResponse(organizationId: string, reservation: Extract<AiResponseEntitlement, { allowed: true }>) {
  if (reservation.source === "trial") {
    await prisma.organization.updateMany({
      where: { id: organizationId, freeAiResponsesRemaining: { lt: 15 } },
      data: { freeAiResponsesRemaining: { increment: 1 } },
    });
    return;
  }

  await prisma.billingSubscription.updateMany({
    where: {
      organizationId,
      periodStartedAt: reservation.periodStartedAt,
      messagesUsed: { gt: 0 },
    },
    data: { messagesUsed: { decrement: 1 } },
  });
}

export async function notifyTrialUpgradeEmail(organizationId: string) {
  const [organization, now] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { freeAiResponsesRemaining: true, trialUpgradeEmailSentAt: true },
    }),
    Promise.resolve(new Date()),
  ]);
  if (!organization || organization.freeAiResponsesRemaining > 0 || organization.trialUpgradeEmailSentAt) return;
  await sendUpgradeEmailOnce(organizationId, now);
}

export async function getOrganizationBillingStatus(organizationId: string) {
  const [subscription, organization] = await Promise.all([
    prisma.billingSubscription.findUnique({ where: { organizationId } }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { freeAiResponsesRemaining: true },
    }),
  ]);
  const now = new Date();

  if (!subscription) {
    const remaining = organization?.freeAiResponsesRemaining ?? 0;
    return {
      plan: "trial",
      status: remaining > 0 ? "ACTIVE" : "EXPIRED",
      remainingMessages: remaining,
      messageLimit: 15,
      expiresAt: null,
      activeWhatsAppChannels: 1,
      assistants: 1,
      responsibleLimit: 0,
    };
  }

  const plan = getBillingPlan(subscription.plan);
  const active = subscription.status === "ACTIVE" && subscription.expiresAt > now;
  const periodExpired = now.getTime() - subscription.periodStartedAt.getTime() >= BILLING_PERIOD_MS;
  const messagesUsed = periodExpired ? 0 : subscription.messagesUsed;
  return {
    plan: plan.key,
    status: active ? "ACTIVE" : "EXPIRED",
    remainingMessages: active ? Math.max(0, plan.messages - messagesUsed) : 0,
    messageLimit: plan.messages,
    expiresAt: subscription.expiresAt,
    activeWhatsAppChannels: plan.activeWhatsAppChannels,
    assistants: plan.assistants,
    responsibleLimit: plan.responsibleLimit,
  };
}
