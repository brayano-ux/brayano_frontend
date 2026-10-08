import { prisma } from "../database/client.js";
import { getPlatformAdminEmails } from "../organizations/platform-admins.js";
import type { ConnectionOutage } from "../whatsapp/connection-monitor.js";
import { isEmailConfigured, sendEmail } from "./email.service.js";

const TIME_ZONE = "Africa/Douala";

export interface OrganizationDetails {
  id: string;
  name: string;
  createdAt: Date;
  phoneNumber: string | null;
  platformSuspended: boolean;
  lastMessageAt: Date | null;
  admins: Array<{ name: string; email: string }>;
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return `${days} jour${days > 1 ? "s" : ""}${restHours ? ` ${restHours} h` : ""}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "aucun";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }).format(date);
}

const REASON_TEXT: Record<ConnectionOutage["reason"], string> = {
  logged_out: "Le numéro a été déconnecté depuis le téléphone (Paramètres WhatsApp, Appareils liés) ou WhatsApp a invalidé la session. Le client doit rescanner un QR code : cela ne se rétablit pas tout seul.",
  connection_lost: "La connexion est coupée et ne se rétablit pas toute seule (problème réseau, serveur, session corrompue ou disque plein).",
  manual: "Déconnexion volontaire.",
};

function describeOrganization(details: OrganizationDetails): string {
  const admins = details.admins.length
    ? details.admins.map((admin) => `  - ${admin.name} <${admin.email}>`).join("\n")
    : "  - aucun compte administrateur trouvé";
  return [
    "Entreprise",
    `  - Nom : ${details.name}`,
    `  - Identifiant : ${details.id}`,
    `  - Numéro WhatsApp : ${details.phoneNumber ? `+${details.phoneNumber.replace(/^\+/, "")}` : "inconnu"}`,
    `  - Inscrite le : ${formatDate(details.createdAt)}`,
    `  - Dernier message échangé : ${formatDate(details.lastMessageAt)}`,
    `  - IA suspendue par la plateforme : ${details.platformSuspended ? "oui" : "non"}`,
    "",
    "Contacts à prévenir (administrateurs de l'entreprise)",
    admins,
  ].join("\n");
}

export function buildDisconnectAlert(details: OrganizationDetails, outage: ConnectionOutage, nowMs: number) {
  const status = outage.status === "QR_PENDING" ? "en attente d'un scan de QR code" : "déconnecté";
  return {
    subject: `WhatsApp déconnecté : ${details.name}`,
    text: [
      `Le numéro WhatsApp de « ${details.name} » est ${status} depuis ${formatDuration(nowMs - outage.since.getTime())} (depuis le ${formatDate(outage.since)}).`,
      "Pendant ce temps, l'IA ne reçoit ni ne répond à aucun message de ses prospects.",
      "",
      `Cause probable : ${REASON_TEXT[outage.reason]}`,
      "",
      describeOrganization(details),
      "",
      "À faire : prévenir le client afin qu'il ouvre son tableau de bord, onglet WhatsApp, clique sur « Connecter » puis scanne le QR code avec le téléphone du numéro.",
    ].join("\n"),
  };
}

export function buildRecoveredNotice(details: OrganizationDetails, downMs: number) {
  return {
    subject: `WhatsApp reconnecté : ${details.name}`,
    text: `Le numéro WhatsApp de « ${details.name} » est de nouveau connecté après ${formatDuration(downMs)} d'interruption. L'IA répond à nouveau à ses prospects.`,
  };
}

export async function loadOrganizationDetails(organizationId: string): Promise<OrganizationDetails | null> {
  const [organization, admins, lastMessage] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        platformSuspended: true,
        whatsappAccounts: { select: { phoneNumber: true }, orderBy: { updatedAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.findMany({ where: { organizationId, role: "ADMIN" }, select: { name: true, email: true } }),
    prisma.message.findFirst({
      where: { conversation: { organizationId } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  if (!organization) return null;
  return {
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt,
    phoneNumber: organization.whatsappAccounts[0]?.phoneNumber ?? null,
    platformSuspended: organization.platformSuspended,
    lastMessageAt: lastMessage?.createdAt ?? null,
    admins,
  };
}

async function deliver(subject: string, text: string, organizationId: string) {
  const recipients = getPlatformAdminEmails();
  if (recipients.length === 0) {
    console.warn(`[org:${organizationId}] Alerte WhatsApp non envoyée : aucun email propriétaire (PLATFORM_ADMIN_EMAILS).`);
    return 0;
  }
  if (!isEmailConfigured()) {
    console.warn(`[org:${organizationId}] Alerte WhatsApp non envoyée : SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM).`);
    return 0;
  }
  let sent = 0;
  for (const to of recipients) {
    try {
      if (await sendEmail({ to, subject, text })) sent += 1;
    } catch (error) {
      console.error(`[org:${organizationId}] Alerte WhatsApp refusée par le serveur SMTP :`, error);
    }
  }
  console.log(`[org:${organizationId}] Alerte WhatsApp "${subject}" : ${sent}/${recipients.length} email(s) envoyé(s).`);
  return sent;
}

export async function sendWhatsAppDisconnectAlert(outage: ConnectionOutage, nowMs: number = Date.now()) {
  const details = await loadOrganizationDetails(outage.organizationId);
  if (!details) return 0;
  const { subject, text } = buildDisconnectAlert(details, outage, nowMs);
  return deliver(subject, text, outage.organizationId);
}

export async function sendWhatsAppRecoveredNotice(outage: ConnectionOutage, downMs: number) {
  const details = await loadOrganizationDetails(outage.organizationId);
  if (!details) return 0;
  const { subject, text } = buildRecoveredNotice(details, downMs);
  return deliver(subject, text, outage.organizationId);
}
