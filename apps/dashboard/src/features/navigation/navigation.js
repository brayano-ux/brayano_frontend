import { $, $$ } from "../../utils/dom.js";
import { formatClock, formatFullDate } from "../../utils/format.js";
import { getState } from "../../state/store.js";
import { APP_CONFIG } from "../../config.js";

const leaveGuards = new Map();

export function registerLeaveGuard(view, canLeave) {
  leaveGuards.set(view, canLeave);
}

export const UNSAVED_CHANGES_MESSAGE =
  "Vous avez des modifications non enregistrées sur cette page. Si vous continuez, elles seront perdues.\n\nQuitter sans enregistrer ?";

function currentView() {
  const visible = $$(".view").find((section) => !section.classList.contains("hidden"));
  return visible ? visible.id.replace(/-view$/, "") : null;
}

export function setView(view, onViewShown = {}) {
  const current = currentView();
  const guard = current ? leaveGuards.get(current) : null;
  if (guard && !guard()) return false;
  $$(".view").forEach((section) => section.classList.toggle("hidden", section.id !== `${view}-view`));
  $$(".nav-item[data-view], .tab-item[data-view]").forEach((item) => {
    const active = item.dataset.view === view;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  $("#tab-more")?.classList.toggle("active", !$(".tab-item[data-view].active"));
  window.scrollTo({ top: 0 });
  onViewShown[view]?.();
  return true;
}

export function updateRealtimeHeader() {
  const dateLabel = $("#overview-date");
  const greetingLabel = $("#company-greeting");
  const orgName = $("#org-select")?.selectedOptions?.[0]?.textContent || getState().organizationName || "Entreprise";

  if (dateLabel) {
    dateLabel.textContent = `${formatFullDate().toUpperCase()} • ${formatClock()}`;
  }

  if (greetingLabel) {
    greetingLabel.textContent = orgName || "Bienvenue";
  }
}

export function initNavigation(onViewShown) {
  $$('[data-view], [data-view-target]').forEach((element) => {
    element.onclick = () => setView(element.dataset.view || element.dataset.viewTarget, onViewShown);
  });

  const trigger = $("#mobile-menu-trigger");
  const sidebar = $("#sidebar");
  const overlay = $("#sidebar-overlay");

  const toggleMenu = () => {
    sidebar.classList.toggle("mobile-open");
    overlay.classList.toggle("active");
  };

  trigger?.addEventListener("click", toggleMenu);
  overlay?.addEventListener("click", toggleMenu);
  $("#tab-more")?.addEventListener("click", toggleMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("mobile-open")) toggleMenu();
  });

  $$(".nav-item, .tab-item[data-view]").forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= APP_CONFIG.mobileBreakpointPx && sidebar.classList.contains("mobile-open")) {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("active");
      }
    });
  });

  setInterval(updateRealtimeHeader, 1000);
}
