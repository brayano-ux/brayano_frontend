import { api } from "../../services/api.js";
import { $ } from "../../utils/dom.js";
import { getState } from "../../state/store.js";
import { isAgentRole } from "../navigation/roles.js";

export function applyPlatformSuspension(suspension) {
  const suspended = Boolean(suspension?.suspended);

  const banner = $("#platform-suspension-banner");
  if (banner) {
    banner.classList.toggle("hidden", !suspended);
    banner.textContent = suspended
      ? `Votre agent IA est suspendu par l'administrateur de la plateforme.${suspension.reason ? ` Motif : ${suspension.reason}.` : ""} Les messages de vos prospects arrivent toujours : vous pouvez continuer à gérer votre boîte.`
      : "";
  }

  const toggle = $("#global-ai-enabled");
  if (toggle) {
    toggle.disabled = suspended;
    toggle.title = suspended ? "Suspendu par l'administrateur de la plateforme" : "";
  }
}

export async function loadPlatformSuspension() {
  const organizationId = getState().organizationId;
  if (!organizationId || isAgentRole()) return;
  try {
    const { platformSuspension } = await api(`/organizations/${organizationId}/ai-settings`);
    applyPlatformSuspension(platformSuspension);
  } catch {
    // Silent fallback
  }
}
