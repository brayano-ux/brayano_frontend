import { api } from "../../services/api.js";
import { $, $$, showToast } from "../../utils/dom.js";
import { getState } from "../../state/store.js";

export function loadBroadcastsView() {
  const payload = { broadcasts: [] };
  const list = $("#bc-list");
  if (!list) return;
  list.innerHTML = payload.broadcasts.length ? payload.broadcasts.map((item) => `
    <article class="bc-item">
      <header>
        <strong>${item.title || "Message groupé"}</strong>
        <span class="status-chip neutral">Envoyé</span>
      </header>
      <p class="bc-text">${item.text || ""}</p>
      <footer>
        <small>${item.sentAt || ""}</small>
        <small>${item.count || 0} destinataires</small>
      </footer>
    </article>
  `).join("") : '<div class="empty-state">Aucun envoi récent.</div>';
}

export function initBroadcasts() {
  const form = $("#broadcast-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const text = $("#bc-text").value.trim();
      if (!text) return showToast("Rédigez un message avant d'envoyer.", "error");
      await api(`/organizations/${getState().organizationId}/broadcasts`, {
        method: "POST",
        body: JSON.stringify({ text, stages: [...$$('#bc-stages input:checked')].map((el) => el.value), windowDays: Number($("#bc-window").value) }),
      });
      showToast("Message groupé envoyé.", "success");
      loadBroadcastsView();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}
