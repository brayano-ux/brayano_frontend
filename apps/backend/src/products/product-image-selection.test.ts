import { describe, expect, it } from "vitest";
import {
  buildProductDetailsMessage,
  buildProductImageCaption,
  resolveRequestedProductImage,
} from "./product-image-selection.js";

const selectedImageUrl = "https://api.example.com/media/products/org/selected.jpg";
const catalog = [
  { id: "selected", imageUrl: selectedImageUrl },
  { id: "without-image", imageUrl: null },
];

describe("requested product image selection", () => {
  it("returns the stored image for the selected catalog product after an image request", () => {
    expect(resolveRequestedProductImage({
      message: "Peux-tu m’envoyer la photo de ce produit ?",
      productId: "selected",
      products: catalog,
    })).toBe(selectedImageUrl);
  });

  it("does not send a model-provided URL or an image the prospect did not request", () => {
    expect(resolveRequestedProductImage({
      message: "Ce produit coûte combien ?",
      productId: "selected",
      products: catalog,
      legacyImageUrl: "https://attacker.example/image.jpg",
      configuredLegacyImageUrl: "https://api.example.com/agent.png",
    })).toBeNull();
    expect(resolveRequestedProductImage({
      message: "Je voudrais voir le produit.",
      productId: "selected",
      products: catalog,
      legacyImageUrl: "https://attacker.example/image.jpg",
      configuredLegacyImageUrl: "https://api.example.com/agent.png",
    })).toBe(selectedImageUrl);
  });

  it("does not substitute an unrelated agent image for a missing product image", () => {
    expect(resolveRequestedProductImage({
      message: "Montre-moi une image du produit.",
      productId: "without-image",
      products: catalog,
      legacyImageUrl: "https://api.example.com/agent.png",
      configuredLegacyImageUrl: "https://api.example.com/agent.png",
    })).toBeNull();
  });
});

describe("product information sent with product images", () => {
  const product = {
    name: "Sandalette Confort",
    description: "Semelle antidérapante, bride réglable et disponible en plusieurs pointures.",
    category: "Chaussures",
    price: "12 500 FCFA",
  };

  it("adds stored product characteristics and commercial facts to the WhatsApp text", () => {
    const message = buildProductDetailsMessage("Voici le modèle demandé.", product);

    expect(message).toContain("Voici le modèle demandé.");
    expect(message).toContain("Produit : Sandalette Confort");
    expect(message).toContain("Catégorie : Chaussures");
    expect(message).toContain("Prix : 12 500 FCFA");
    expect(message).toContain(product.description);
  });

  it("keeps the image caption short while naming the selected product", () => {
    expect(buildProductImageCaption(product)).toBe("Sandalette Confort · 12 500 FCFA");
  });
});
