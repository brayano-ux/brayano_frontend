import { describe, expect, it } from "vitest";
import {
  createProductImageToken,
  resolveProductImageMimeType,
  validateProductImagePayload,
  verifyProductImageToken,
} from "./products.service.js";

describe("product image validation", () => {
  it("accepts a PNG payload with the matching content type", () => {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateProductImagePayload("image/png", pngSignature)).toBe("png");
  });

  it("rejects a payload whose bytes do not match its declared image type", () => {
    expect(() => validateProductImagePayload("image/png", Buffer.from("not an image")))
      .toThrow("Le contenu du fichier ne correspond pas au format image déclaré.");
  });

  it("rejects empty files and images larger than 5 MB", () => {
    expect(() => validateProductImagePayload("image/jpeg", Buffer.alloc(0)))
      .toThrow("L’image doit peser au maximum 5 Mo.");
    expect(() => validateProductImagePayload("image/jpeg", Buffer.alloc(5 * 1024 * 1024 + 1)))
      .toThrow("L’image doit peser au maximum 5 Mo.");
  });
});

describe("product image response content type", () => {
  it.each([
    ["product.jpg", "image/jpeg"],
    ["product.png", "image/png"],
    ["product.webp", "image/webp"],
  ])("maps %s to %s", (filename, mimeType) => {
    expect(resolveProductImageMimeType(filename)).toBe(mimeType);
  });
});

describe("product image token validation", () => {
  it("accepts only the exact signed URL token for a given organization and file", () => {
    const token = createProductImageToken("org-123", "product.png");

    expect(verifyProductImageToken("org-123", "product.png", token)).toBe(true);
    expect(verifyProductImageToken("org-123", "other.png", token)).toBe(false);
    expect(verifyProductImageToken("other-org", "product.png", token)).toBe(false);
    expect(verifyProductImageToken("org-123", "product.png", "tampered-token")).toBe(false);
  });
});
