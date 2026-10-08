import type { FastifyInstance } from "fastify";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import {
  listOrganizationsForAdmin,
  suspendOrganization,
  unsuspendOrganization,
} from "../organizations/platform-suspension.service.js";
import { ValidationError } from "../shared/errors.js";

const suspendSchema = z.object({ reason: z.string().trim().max(300).optional() });

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isValidPlatformAdminToken(authorization: string | undefined) {
  const expected = env.PLATFORM_ADMIN_TOKEN;
  if (!expected) return false;
  const provided = /^Bearer (.+)$/.exec(authorization ?? "")?.[1];
  if (!provided) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}

/**
 * Routes réservées au propriétaire de la plateforme, protégées par
 * PLATFORM_ADMIN_TOKEN (aucune session d'entreprise ne peut les appeler).
 */
export async function adminRoute(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    if (!env.PLATFORM_ADMIN_TOKEN) {
      reply.code(503).send({ message: "Administration plateforme désactivée : PLATFORM_ADMIN_TOKEN n'est pas configuré." });
      return;
    }
    if (!isValidPlatformAdminToken(request.headers.authorization)) {
      reply.code(401).send({ message: "Non autorisé." });
    }
  });

  app.get("/admin/organizations", async () => ({ organizations: await listOrganizationsForAdmin() }));

  app.post("/admin/organizations/:orgId/suspend", async (request) => {
    const { orgId } = request.params as { orgId: string };
    const parsed = suspendSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);
    await suspendOrganization(orgId, parsed.data.reason || null);
    return { organizationId: orgId, platformSuspended: true };
  });

  app.post("/admin/organizations/:orgId/unsuspend", async (request) => {
    const { orgId } = request.params as { orgId: string };
    await unsuspendOrganization(orgId);
    return { organizationId: orgId, platformSuspended: false };
  });
}
