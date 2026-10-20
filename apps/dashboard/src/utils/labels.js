/**
 * Libellés lisibles pour le propriétaire : étiquettes de suivi, intentions détectées, actions de l'assistant.
 * Aucun jargon technique ne doit apparaître à l'écran.
 */

export const STAGES = ["NEW", "INTERESTED", "ORDERED", "CALLBACK"];

export const STAGE_LABELS = {
  NEW: "Nouveau",
  INTERESTED: "Intéressé",
  ORDERED: "A commandé",
  CALLBACK: "À rappeler",
};

export const STAGE_TONES = {
  NEW: "neutral",
  INTERESTED: "info",
  ORDERED: "success",
  CALLBACK: "warning",
};

export const INTENT_LABELS = {
  salutation: "Salutation",
  demande_information: "Demande d'information",
  demande_prix: "Demande de prix",
  demande_disponibilite: "Demande de disponibilité",
  demande_localisation: "Demande d'adresse",
  demande_commande: "Veut commander",
  demande_inscription: "Veut s'inscrire",
  demande_livraison: "Question sur la livraison",
  demande_paiement: "Question sur le paiement",
  achat: "Prêt à acheter",
  demande_contact_humain: "Veut parler à une personne",
  reclamation: "Réclamation",
  remerciement: "Remerciement",
  hors_sujet: "Hors sujet",
  autre: "Autre",
  erreur_traitement: "Erreur technique",
};

export function describeAiMeta(meta) {
  if (!meta || typeof meta !== "object") return [];
  const lines = [];

  if (meta.kind === "welcome") return ["Message d'accueil de votre entreprise, envoyé au premier contact."];
  if (meta.kind === "opt_out") return ["Le client a écrit STOP : il ne recevra plus de relances ni de messages groupés."];
  if (meta.kind === "follow_up") return [`Relance automatique n°${meta.number || 1} : le client n'avait pas répondu.`];
  if (meta.kind === "broadcast") return ["Message groupé envoyé depuis la page « Messages groupés »."];

  if (meta.intent) {
    const confidence = typeof meta.confidence === "number" ? ` (confiance ${Math.round(meta.confidence * 100)} %)` : "";
    lines.push(`Ce que l'assistant a compris : ${INTENT_LABELS[meta.intent] || meta.intent}${confidence}.`);
  }
  if (meta.photosSent) {
    const names = Array.isArray(meta.productNames) && meta.productNames.length ? ` (${meta.productNames.join(", ")})` : "";
    lines.push(`Photo${meta.photosSent > 1 ? "s" : ""} envoyée${meta.photosSent > 1 ? "s" : ""}${names}.`);
  }
  if (meta.welcomeSent) lines.push("Le message d'accueil a été envoyé juste avant.");
  if (meta.closedHours) lines.push("Votre entreprise était fermée : l'assistant l'a pris en compte.");
  if (meta.correctionsUsed) lines.push(`${meta.correctionsUsed} de vos corrections appliquée${meta.correctionsUsed > 1 ? "s" : ""}.`);
  if (meta.examplesUsed) lines.push(`Inspiré de ${meta.examplesUsed} conversation${meta.examplesUsed > 1 ? "s" : ""} passée${meta.examplesUsed > 1 ? "s" : ""}.`);
  if (meta.needsHuman) lines.push("L'assistant a passé la main : vous avez reçu un email.");
  return lines;
}

export function previewOf(message) {
  if (!message) return "Aucun message";
  if (message.type === "IMAGE") return "📷 Photo";
  if (message.type === "DOCUMENT") return "📎 Document";
  return message.content || "Aucun message";
}
