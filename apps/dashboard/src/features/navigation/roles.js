/**
 * Rôles : le propriétaire (ADMIN) voit tout ; un employé (AGENT) répond aux clients et suit commandes et rendez-vous.
 */
export const ADMIN_ONLY_VIEWS = ["agent", "products", "broadcasts", "whatsapp", "settings"];

export function isAgentRole() {
  return document.body.classList.contains("role-agent");
}

export function applyRole(role) {
  document.body.classList.toggle("role-agent", role === "AGENT");
}

export async function loadRole() {
  try {
    const session = JSON.parse(localStorage.getItem("brayano_session") || "null");
    const role = session?.role === "AGENT" ? "AGENT" : "ADMIN";
    applyRole(role);
    const label = $("#user-email");
    if (label && role === "AGENT") label.textContent = `${session.email} · Employé`;
    return role;
  } catch {
    applyRole("ADMIN");
    return "ADMIN";
  }
}

function $(selector) {
  return document.querySelector(selector);
}
