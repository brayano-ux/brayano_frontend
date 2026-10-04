import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import { prisma } from "../database/client.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";

const imageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function validateProductImagePayload(mimeType: string, contents: Buffer) {
  const extension = imageTypes.get(mimeType);
  if (!extension) throw new ValidationError("Format accepté : JPEG, PNG ou WebP.");
  if (!contents.length || contents.length > 5 * 1024 * 1024) {
    throw new ValidationError("L’image doit peser au maximum 5 Mo.");
  }

  const validSignature = extension === "jpg"
    ? contents.length >= 3 && contents[0] === 0xff && contents[1] === 0xd8 && contents[2] === 0xff
    : extension === "png"
      ? contents.length >= 8 && contents.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : contents.length >= 12 && contents.toString("ascii", 0, 4) === "RIFF" && contents.toString("ascii", 8, 12) === "WEBP";
  if (!validSignature) throw new ValidationError("Le contenu du fichier ne correspond pas au format image déclaré.");
  return extension;
}

export function resolveProductImageMimeType(filename: string) {
  const extension = filename.split(".").at(-1)?.toLowerCase();
  if (extension === "jpg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return undefined;
}

function productImageDirectory(organizationId: string) {
  return path.join(path.resolve(env.PRODUCT_IMAGE_DIR), organizationId);
}

export function createProductImageToken(organizationId: string, filename: string, issuedAt = Date.now()) {
  const secret = env.MEDIA_SIGNING_SECRET || "development-media-secret";
  const digest = createHmac("sha256", secret).update(`${organizationId}:${filename}:${issuedAt}`).digest("hex");
  return `${issuedAt}:${digest}`;
}

export function verifyProductImageToken(organizationId: string, filename: string, token: string | undefined, now = Date.now()) {
  if (!token) return false;

  const [issuedAtValue, digest] = token.split(":");
  const issuedAt = Number.parseInt(issuedAtValue ?? "0", 10);
  if (!digest || !Number.isFinite(issuedAt) || now - issuedAt > env.MEDIA_URL_TTL_SECONDS * 1000) {
    return false;
  }

  const expectedToken = createProductImageToken(organizationId, filename, issuedAt);
  return expectedToken === token;
}

export async function listProducts(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId },
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
  });
}

export async function listProductsForAssistant(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId, active: true },
    select: { id: true, name: true, description: true, category: true, price: true, imageUrl: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
}

export async function createProduct(
  organizationId: string,
  input: { name: string; description: string; category?: string | undefined; price?: string | undefined },
) {
  return prisma.product.create({
    data: {
      organizationId,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category?.trim() || null,
      price: input.price?.trim() || null,
    },
  });
}

export async function updateProduct(
  organizationId: string,
  productId: string,
  input: { name?: string | undefined; description?: string | undefined; category?: string | undefined; price?: string | undefined; active?: boolean | undefined },
) {
  const product = await prisma.product.findFirst({ where: { id: productId, organizationId } });
  if (!product) throw new NotFoundError("Produit introuvable.");

  return prisma.product.update({
    where: { id: productId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category.trim() || null } : {}),
      ...(input.price !== undefined ? { price: input.price.trim() || null } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
}

export async function deleteProduct(organizationId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, organizationId } });
  if (!product) throw new NotFoundError("Produit introuvable.");

  await prisma.product.delete({ where: { id: productId } });
  await removeProductImageFiles(organizationId, productId);
}

export async function saveProductImage(
  organizationId: string,
  productId: string,
  mimeType: string,
  contents: Buffer,
  publicBaseUrl: string,
) {
  const extension = validateProductImagePayload(mimeType, contents);

  const product = await prisma.product.findFirst({ where: { id: productId, organizationId } });
  if (!product) throw new NotFoundError("Produit introuvable.");

  const directory = productImageDirectory(organizationId);
  await fs.mkdir(directory, { recursive: true });

  const filename = `${productId}.${extension}`;
  const destination = path.join(directory, filename);
  const temporaryFile = path.join(directory, `${randomUUID()}.tmp`);
  await fs.writeFile(temporaryFile, contents, { flag: "wx" });
  await fs.rename(temporaryFile, destination);

  const token = createProductImageToken(organizationId, filename);
  const imageUrl = `${publicBaseUrl.replace(/\/$/, "")}/media/products/${organizationId}/${filename}?t=${token}`;
  let updatedProduct;
  try {
    updatedProduct = await prisma.product.update({ where: { id: productId }, data: { imageUrl } });
  } catch (error) {
    await fs.rm(destination, { force: true });
    throw error;
  }
  await removeProductImageFiles(organizationId, productId, extension);
  return updatedProduct;
}

async function removeProductImageFiles(organizationId: string, productId: string, exceptExtension?: string) {
  const directory = productImageDirectory(organizationId);
  await Promise.all(
    ["jpg", "png", "webp"].filter((extension) => extension !== exceptExtension).map((extension) =>
      fs.rm(path.join(directory, `${productId}.${extension}`), { force: true }),
    ),
  );
}

export async function readProductImage(organizationId: string, filename: string) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) return null;
  const filePath = path.join(productImageDirectory(organizationId), filename);
  try {
    return { contents: await fs.readFile(filePath), mimeType: resolveProductImageMimeType(filename) };
  } catch {
    return null;
  }
}
