import { env } from "../config/env.js";
import { prisma } from "../database/client.js";
import { sendEmail } from "./email.service.js";

export type SuspensionEmailKind = "suspended" | "reactivated";

function buildMessage(kind: SuspensionEmailKind, organizationName: string, reason: string | null) {
  const support = env.SUPPORT_EMAIL ? ` Pour toute question, écrivez-nous à ${env.SUPPORT_EMAIL}.` : "";
  if (kind === "suspended") {
    return {
      subject: "Votre assistant IA a été suspendu",
      text: `Bonjour,\n\nL'assistant IA de ${organizationName} a été suspendu par l'administrateur de la plateforme.${reason ? ` Motif : ${reason}.` : ""}\n\nTant que la suspension dure, l'assistant ne répond plus automatiquement à vos prospects. Les messages continuent d'arriver et vous pouvez y répondre à la main depuis votre tableau de bord.${support}`,
    };
  }
  return {
    subject: "Votre assistant IA est de nouveau actif",
    text: `Bonjour,\n\nLa suspension de l'assistant IA de ${organizationName} a été levée : il répond de nouveau automatiquement à vos prospects.${support}`,
  };
}

/** Prévient les administrateurs de l'entreprise. Renvoie le nombre d'emails réellement envoyés. */
export async function sendSuspensionEmail(organizationId: string, kind: SuspensionEmailKind, reason: string | null): Promise<number> {
  const [organization, admins] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    prisma.user.findMany({ where: { organizationId, role: "ADMIN" }, select: { email: true } }),
  ]);
  if (!organization || admins.length === 0) return 0;

  const { subject, text } = buildMessage(kind, organization.name, reason);
  let sent = 0;
  for (const admin of admins) {
    try {
      if (await sendEmail({ to: admin.email, subject, text })) sent += 1;
    } catch (error) {
      console.error(`[org:${organizationId}] Email de suspension non envoyé à un administrateur :`, error);
    }
  }
  return sent;
}
