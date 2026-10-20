import { api } from "../../services/api.js";
import { $, showToast } from "../../utils/dom.js";
import { getState } from "../../state/store.js";

let responsibleConfigs = [];

function renderResponsibleConfigs() {
  const list = $("#routing-responsibles");
  if (!list) return;
  list.innerHTML = responsibleConfigs.length
    ? responsibleConfigs.map((entry) => `
      <div class="responsible-row">
        <div>
          <strong>${entry.location || "Localisation"}</strong>
          <small>${entry.email || entry.name || "Aucun contact"}</small>
        </div>
        <div class="row-actions">
          <button type="button" data-edit-responsible="${entry.id}">Modifier</button>
          <button type="button" class="danger" data-delete-responsible="${entry.id}">Supprimer</button>
        </div>
      </div>
    `).join("")
    : '<div class="empty-state">Aucune configuration enregistrée.</div>';
}

export async function loadRoutingConfig() {
  try {
    const { locations = [] } = await api(`/organizations/${getState().organizationId}/routing`);
    responsibleConfigs = locations;
    renderResponsibleConfigs();
  } catch (error) {
    showToast(error.message, "error");
  }
}

export function initRoutingSettings() {
  $("#routing-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const location = $("#routing-location")?.value.trim();
    const name = $("#routing-name")?.value.trim();
    const email = $("#routing-email")?.value.trim();

    try {
      await api(`/organizations/${getState().organizationId}/routing`, {
        method: "POST",
        body: JSON.stringify({ location, name, email }),
      });
      $("#routing-form").reset();
      await loadRoutingConfig();
      showToast("Responsable enregistré.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}
