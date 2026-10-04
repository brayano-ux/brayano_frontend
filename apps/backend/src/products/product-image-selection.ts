export type ProductImageCandidate = {
  id: string;
  imageUrl: string | null;
};

export type ProductDetails = {
  name: string;
  description: string;
  category: string | null;
  price: string | null;
};

export function buildProductDetailsMessage(reply: string, product: ProductDetails) {
  const details = [
    `Produit : ${product.name}`,
    product.category ? `Catégorie : ${product.category}` : null,
    product.price ? `Prix : ${product.price}` : null,
    product.description ? `Caractéristiques : ${product.description}` : null,
  ].filter((line): line is string => Boolean(line));

  return `${reply.trim()}\n\n${details.join("\n")}`.trim();
}

export function buildProductImageCaption(product: ProductDetails) {
  return [product.name, product.price].filter(Boolean).join(" · ");
}

export function resolveRequestedProductImage(input: {
  message: string;
  productId?: string | undefined;
  products: ProductImageCandidate[];
  legacyImageUrl?: string | null | undefined;
  configuredLegacyImageUrl?: string | null | undefined;
}) {
  const imageRequested = /\b(photo|photos|image|images|visuel|visuels|voir|montre|montrer)\b/i.test(input.message);
  if (!imageRequested) return null;

  const selectedProduct = input.products.find((product) => product.id === input.productId && product.imageUrl);
  if (selectedProduct?.imageUrl) return selectedProduct.imageUrl;

  if (
    input.products.length === 0 &&
    input.legacyImageUrl &&
    input.legacyImageUrl === input.configuredLegacyImageUrl
  ) {
    return input.legacyImageUrl;
  }

  return null;
}
