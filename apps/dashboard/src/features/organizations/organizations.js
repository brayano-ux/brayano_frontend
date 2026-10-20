import { api } from "../../services/api.js";
import { $, escapeHtml } from "../../utils/dom.js";
import { getState, setState } from "../../state/store.js";

export async function loadOrganizations(onOrganizationReady) {
  const data = await api("/organizations");
  const select = $("#org-select");
  const orgPicker = $(".org-picker");
  const session = JSON.parse(localStorage.getItem("brayano_session") || "null");
  const organizations = data.organizations || [];
  const availableOrgId = session?.organizationId || getState().organizationId;

  if (!organizations.length) {
    if (orgPicker) orgPicker.classList.add("hidden");
    return;
  }

  const filteredOrganizations = availableOrgId
    ? organizations.filter((org) => org.id === availableOrgId)
    : organizations;
  const visibleOrganizations = filteredOrganizations.length ? filteredOrganizations : organizations;

  if (orgPicker) {
    orgPicker.classList.toggle("hidden", visibleOrganizations.length <= 1);
  }

  if (!visibleOrganizations.length) {
    select.innerHTML = "<option>Aucune entreprise</option>";
    return;
  }

  select.innerHTML = visibleOrganizations
    .map((org) => `<option value="${escapeHtml(org.id)}">${escapeHtml(org.name)}</option>`)
    .join("");

  const organizationId = visibleOrganizations.some((org) => org.id === availableOrgId)
    ? availableOrgId
    : visibleOrganizations[0].id;
  const organizationName = visibleOrganizations.find((org) => org.id === organizationId)?.name || visibleOrganizations[0].name || "Brayano";

  setState({ organizationId, organizationName, organizations });
  localStorage.setItem("brayano_org", organizationId);
  select.value = organizationId;

  select.onchange = () => {
    const nextName = organizations.find((org) => org.id === select.value)?.name || "Brayano";
    setState({ organizationId: select.value, organizationName: nextName });
    localStorage.setItem("brayano_org", select.value);
    onOrganizationReady();
  };

  onOrganizationReady();
}
