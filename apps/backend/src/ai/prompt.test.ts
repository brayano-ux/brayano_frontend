import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./prompt.js";
import { aiReplySchema } from "./schemas.js";

const baseSettings = {
  agentName: "Assistant",
  businessInfo: null,
  systemPrompt: "Réponds de manière utile.",
};

describe("product catalog in the assistant prompt", () => {
  it("provides product facts and an image flag without exposing the media URL", () => {
    const product = {
      id: "191e4567-e89b-42d3-a456-426614174000",
      name: "Chaise ergonomique",
      description: "Chaise réglable avec soutien lombaire.",
      category: "Mobilier",
      price: "45 000 FCFA",
      imageUrl: "http://localhost:3000/media/products/org/chaise.jpg",
    };

    const prompt = buildSystemPrompt({ ...baseSettings, products: [product] });

    expect(prompt).toContain(product.id);
    expect(prompt).toContain(product.name);
    expect(prompt).toContain('"hasImage":true');
    expect(prompt).not.toContain(product.imageUrl);
  });

  it("accepts only a UUID-shaped product selection in the AI response", () => {
    const reply = {
      reply: "Voici le produit qui correspond.",
      intent: "demande_information",
      confidence: 0.9,
      needsHuman: false,
      leadScore: 0,
      qualificationStatus: "not_qualified",
      nextAction: "continue",
      leadData: {},
      productId: "191e4567-e89b-42d3-a456-426614174000",
    };

    expect(aiReplySchema.safeParse(reply).success).toBe(true);
    expect(aiReplySchema.safeParse({ ...reply, productId: "https://example.com/image.jpg" }).success).toBe(false);
  });
});
