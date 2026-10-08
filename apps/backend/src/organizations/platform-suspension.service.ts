import { prisma } from "../database/client.js";
import { sendSuspensionEmail, type SuspensionEmailKind } from "../notifications/suspension-emails.js";
import { NotFoundError } from "../shared/errors.js";

export type PlatformSuspension = { suspended: boolean; reason: string | null; suspendedAt: Date | null };

/** Suspension décidée par le propriétaire de la plateforme, indépendante du réglage `aiEnabled` du client. */
export async function getPlatformSuspension(organizationId: string): Promise<PlatformSuspension> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { platformSuspended: true, suspensionReason: true, suspendedAt: true },
    });
    return {
      suspended: organization?.platformSuspended ?? false,
      reason: organization?.suspensionReason ?? null,
      suspendedAt: organization?.suspendedAt ?? null,
    };
  } catch (error) {
    // Un problème de base ne doit jamais couper l'IA de toutes les entreprises : on laisse répondre.
    console.error(`[org:${organizationId}] Lecture de la suspension plateforme impossible, IA autorisée par défaut :`, error);
    return { suspended: false, reason: null, suspendedAt: null };
  }
}

async function setSuspension(organizationId: string, data: { platformSuspended: boolean; suspensionReason: string | null; suspendedAt: Date | null }) {
  const updated = await prisma.organization.updateMany({ where: { id: organizationId }, data });
  if (updated.count === 0) throw new NotFoundError("Entreprise introuvable.");
}

async function wasSuspended(organizationId: string) {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { platformSuspended: true } });
  if (!organization) throw new NotFoundError("Entreprise introuvable.");
  return organization.platformSuspended;
}

/** L'email part en arrière-plan : son échec ne doit jamais faire échouer l'action de l'administrateur. */
function notifyAdmins(organizationId: string, kind: SuspensionEmailKind, reason: string | null) {
  void sendSuspensionEmail(organizationId, kind, reason).catch((error) => {
    console.error(`[org:${organizationId}] Email de suspension impossible :`, error);
  });
}

export async function suspendOrganization(organizationId: string, reason: string | null) {
  const alreadySuspended = await wasSuspended(organizationId);
  await setSuspension(organizationId, { platformSuspended: true, suspensionReason: reason, suspendedAt: new Date() });
  if (!alreadySuspended) notifyAdmins(organizationId, "suspended", reason);
}

export async function unsuspendOrganization(organizationId: string) {
  const alreadySuspended = await wasSuspended(organizationId);
  await setSuspension(organizationId, { platformSuspended: false, suspensionReason: null, suspendedAt: null });
  if (alreadySuspended) notifyAdmins(organizationId, "reactivated", null);
}

export async function listOrganizationsForAdmin() {
  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      platformSuspended: true,
      suspensionReason: true,
      suspendedAt: true,
      aiSettings: { select: { aiEnabled: true } },
    },
  });
}
