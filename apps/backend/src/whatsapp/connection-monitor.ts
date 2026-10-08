import type { ConnectionLossReason, WhatsAppConnectionStatus } from "./whatsapp.types.js";

export interface ConnectionOutage {
  organizationId: string;
  status: WhatsAppConnectionStatus;
  reason: ConnectionLossReason;
  since: Date;
}

interface MonitorOptions {
  /** Délai avant d'alerter : laisse la reconnexion automatique se faire sans bruit. */
  graceMs: number;
  /** Une déconnexion depuis le téléphone ne se règle pas toute seule : on alerte plus vite. */
  loggedOutGraceMs?: number;
  now?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (timer: unknown) => void;
  onAlert: (outage: ConnectionOutage) => void | Promise<void>;
  onRecovered: (outage: ConnectionOutage, downMs: number) => void | Promise<void>;
}

interface OrganizationState {
  intentional: boolean;
  outage: ConnectionOutage | null;
  timer: unknown;
  alerted: boolean;
}

/**
 * Surveille les déconnexions WhatsApp et n'alerte que quand une action humaine est probablement nécessaire :
 * numéro resté déconnecté au-delà du délai de grâce, jamais pour une déconnexion volontaire
 * ni pour une première connexion en cours (QR code à scanner).
 */
export function createConnectionMonitor(options: MonitorOptions) {
  const now = options.now ?? Date.now;
  const setTimer = options.setTimer ?? ((callback, delayMs) => {
    const timer = setTimeout(callback, delayMs);
    timer.unref?.();
    return timer;
  });
  const clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout));
  const states = new Map<string, OrganizationState>();

  function stateOf(organizationId: string): OrganizationState {
    let state = states.get(organizationId);
    if (!state) {
      state = { intentional: false, outage: null, timer: null, alerted: false };
      states.set(organizationId, state);
    }
    return state;
  }

  function cancelTimer(state: OrganizationState) {
    if (state.timer !== null) clearTimer(state.timer);
    state.timer = null;
  }

  function fire(organizationId: string, state: OrganizationState) {
    state.timer = null;
    if (!state.outage || state.alerted || state.intentional) return;
    state.alerted = true;
    Promise.resolve(options.onAlert(state.outage)).catch((error) => {
      console.error(`[org:${organizationId}] Alerte de déconnexion WhatsApp impossible :`, error);
    });
  }

  return {
    /** À appeler quand l'utilisateur ou le propriétaire déconnecte volontairement un numéro. */
    markIntentional(organizationId: string) {
      const state = stateOf(organizationId);
      state.intentional = true;
      state.outage = null;
      cancelTimer(state);
    },

    handle(organizationId: string, update: { status: WhatsAppConnectionStatus; reason?: ConnectionLossReason; previouslyConnected: boolean }) {
      const state = stateOf(organizationId);

      if (update.status === "CONNECTED") {
        cancelTimer(state);
        const outage = state.outage;
        const wasAlerted = state.alerted;
        state.intentional = false;
        state.outage = null;
        state.alerted = false;
        if (wasAlerted && outage) {
          Promise.resolve(options.onRecovered(outage, now() - outage.since.getTime())).catch((error) => {
            console.error(`[org:${organizationId}] Notification de reconnexion WhatsApp impossible :`, error);
          });
        }
        return;
      }

      // Volontaire, ou première connexion en cours : rien à signaler.
      if (state.intentional || update.reason === "manual" || !update.previouslyConnected) return;

      const reason: ConnectionLossReason = update.reason ?? state.outage?.reason ?? "connection_lost";
      const since = state.outage?.since ?? new Date(now());
      state.outage = { organizationId, status: update.status, reason: reason === "logged_out" ? "logged_out" : state.outage?.reason ?? reason, since };
      if (state.alerted) return;

      const grace = state.outage.reason === "logged_out"
        ? Math.min(options.graceMs, options.loggedOutGraceMs ?? 60_000)
        : options.graceMs;
      cancelTimer(state);
      state.timer = setTimer(() => fire(organizationId, state), Math.max(0, since.getTime() + grace - now()));
    },
  };
}
