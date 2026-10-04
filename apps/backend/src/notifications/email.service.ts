import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  await transporter.sendMail({ from: env.SMTP_FROM, ...input });
  return true;
}

export async function sendTrialUpgradeEmail(to: string) {
  const frontendOrigin = env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).find(Boolean);
  const billingUrl = env.BILLING_PAGE_URL || `${frontendOrigin || env.APP_URL}/billing.html`;
  return sendEmail({
    to,
    subject: "Vos 15 réponses IA gratuites sont utilisées",
    text: `Vous avez utilisé vos 15 réponses gratuites Brayano AI. Choisissez une formule pour continuer à recevoir des réponses automatiques : ${billingUrl}`,
    html: `<p>Vous avez utilisé vos 15 réponses gratuites Brayano AI.</p><p>Choisissez une formule pour continuer à recevoir des réponses automatiques.</p><p><a href="${billingUrl}">Voir les formules</a></p>`,
  });
}
