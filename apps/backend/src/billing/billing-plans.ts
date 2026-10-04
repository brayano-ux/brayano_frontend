export type BillingPlanKey = "starter" | "pro" | "scale";

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  amount: number;
  messages: number;
  activeWhatsAppChannels: number;
  assistants: number;
  responsibleLimit: number | null;
  description: string;
};

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlan> = {
  starter: {
    key: "starter",
    name: "Essentiel",
    amount: 10000,
    messages: 1000,
    activeWhatsAppChannels: 1,
    assistants: 1,
    responsibleLimit: 1,
    description: "1 000 réponses IA par mois, 1 canal WhatsApp, 1 assistant IA, historique, support email et routage vers 1 commercial.",
  },
  pro: {
    key: "pro",
    name: "Pro",
    amount: 20000,
    messages: 5000,
    activeWhatsAppChannels: 1,
    assistants: 1,
    responsibleLimit: 3,
    description: "Tout Essentiel, 5 000 réponses IA par mois et routage vers 3 commerciaux.",
  },
  scale: {
    key: "scale",
    name: "Business",
    amount: 50000,
    messages: 15000,
    activeWhatsAppChannels: 1,
    assistants: 1,
    responsibleLimit: null,
    description: "Tout Pro, 15 000 réponses IA par mois et routage vers un nombre illimité de commerciaux.",
  },
};

export function getBillingPlan(planName: string): BillingPlan {
  const normalized = planName.trim().toLowerCase();
  const mapping: Record<string, BillingPlanKey> = {
    essentiel: "starter", essential: "starter", starter: "starter",
    pro: "pro", premium: "pro", professional: "pro",
    business: "scale", scale: "scale", entreprise: "scale", enterprise: "scale",
  };
  const matchedPlan = mapping[normalized];
  if (!matchedPlan) throw new Error(`Plan de paiement inconnu : ${planName}`);
  return BILLING_PLANS[matchedPlan];
}
