import { readOrganizationId } from "../services/storage.js";

const state = {
  organizationId: readOrganizationId(),
  organizationName: "Brayano",
  organizations: [],
  conversations: [],
  commercialMetrics: [],
  pendingRegistrationEmail: "",
  editingResponsibleId: null,
  agentTestHistory: [],
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
