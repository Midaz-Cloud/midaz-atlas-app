/**
 * Estado de conexión del kiosko con el backend (gateway). Store módulo-level con
 * suscriptores, igual que catalogStore: lo leen servicios fuera de React (checkout,
 * worker de sincronización) y la UI vía useKioskConnectivity.
 *
 * - `online`: el gateway responde.
 * - `degraded`: responde, pero hubo fallos de red recientes en llamadas de negocio.
 *   El checkout lo trata como online (intenta y, si falla, registra local).
 * - `offline`: no responde. Solo vuelve a online por un probe OK, no por un éxito
 *   aislado, para no oscilar.
 * - `unknown`: todavía no se probó (arranque).
 */
export type KioskConnectivityStatus = 'unknown' | 'online' | 'degraded' | 'offline';

export type KioskConnectivitySnapshot = {
  status: KioskConnectivityStatus;
  lastProbeAt: string | null;
  lastOnlineAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
};

export type ConnectivityEvent =
  | { type: 'probe_ok'; at: number }
  | { type: 'probe_failed'; at: number; error: string }
  | { type: 'request_failed'; at: number; error: string }
  | { type: 'request_ok'; at: number }
  | { type: 'force_offline'; at: number; error: string };

/** Fallos de red de negocio dentro de esta ventana que tiran a offline sin esperar al probe. */
export const FAILURE_WINDOW_MS = 30_000;
export const FAILURES_TO_OFFLINE = 2;
/** Tras un fallo de negocio con el gateway vivo, cuánto dura el estado degraded. */
export const DEGRADED_WINDOW_MS = 60_000;

type InternalState = KioskConnectivitySnapshot & {
  recentFailures: number[];
  lastRequestFailureAt: number | null;
};

const INITIAL: InternalState = {
  status: 'unknown',
  lastProbeAt: null,
  lastOnlineAt: null,
  consecutiveFailures: 0,
  lastError: null,
  recentFailures: [],
  lastRequestFailureAt: null,
};

/** Transición pura: (estado, evento) → estado. Toda la lógica testeable vive aquí. */
export function resolveNextConnectivityState(prev: InternalState, event: ConnectivityEvent): InternalState {
  const iso = new Date(event.at).toISOString();
  switch (event.type) {
    case 'probe_ok': {
      const degraded =
        prev.lastRequestFailureAt != null && event.at - prev.lastRequestFailureAt < DEGRADED_WINDOW_MS;
      return {
        ...prev,
        status: degraded ? 'degraded' : 'online',
        lastProbeAt: iso,
        lastOnlineAt: iso,
        consecutiveFailures: 0,
        lastError: degraded ? prev.lastError : null,
        recentFailures: [],
      };
    }
    case 'probe_failed':
    case 'force_offline':
      return {
        ...prev,
        status: 'offline',
        lastProbeAt: event.type === 'probe_failed' ? iso : prev.lastProbeAt,
        consecutiveFailures: prev.consecutiveFailures + 1,
        lastError: event.error,
      };
    case 'request_failed': {
      const recentFailures = [...prev.recentFailures, event.at].filter(
        (t) => event.at - t <= FAILURE_WINDOW_MS,
      );
      const goesOffline = prev.status === 'offline' || recentFailures.length >= FAILURES_TO_OFFLINE;
      return {
        ...prev,
        status: goesOffline ? 'offline' : prev.status === 'unknown' ? 'unknown' : 'degraded',
        consecutiveFailures: prev.consecutiveFailures + 1,
        lastError: event.error,
        recentFailures,
        lastRequestFailureAt: event.at,
      };
    }
    case 'request_ok':
      // Un éxito aislado no saca de offline: eso lo decide el probe.
      if (prev.status === 'offline') {
        return prev;
      }
      return {
        ...prev,
        status: prev.status === 'degraded' ? 'degraded' : 'online',
        lastOnlineAt: iso,
        consecutiveFailures: 0,
      };
    default:
      return prev;
  }
}

let state: InternalState = { ...INITIAL };
let pinnedOnline = false;
const listeners = new Set<(s: KioskConnectivitySnapshot) => void>();

function toSnapshot(s: InternalState): KioskConnectivitySnapshot {
  return {
    status: s.status,
    lastProbeAt: s.lastProbeAt,
    lastOnlineAt: s.lastOnlineAt,
    consecutiveFailures: s.consecutiveFailures,
    lastError: s.lastError,
  };
}

let snapshot: KioskConnectivitySnapshot = toSnapshot(state);

function dispatch(event: ConnectivityEvent): void {
  if (pinnedOnline) {
    return;
  }
  const next = resolveNextConnectivityState(state, event);
  const changed =
    next.status !== state.status ||
    next.lastError !== state.lastError ||
    next.consecutiveFailures !== state.consecutiveFailures ||
    next.lastProbeAt !== state.lastProbeAt;
  state = next;
  if (!changed) {
    return;
  }
  snapshot = toSnapshot(state);
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // un suscriptor roto no debe romper a los demás
    }
  }
}

export function getKioskConnectivity(): KioskConnectivitySnapshot {
  return snapshot;
}

export function subscribeKioskConnectivity(listener: (s: KioskConnectivitySnapshot) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isKioskOffline(): boolean {
  return snapshot.status === 'offline';
}

export function reportKioskProbeResult(ok: boolean, error?: string): void {
  dispatch(ok ? { type: 'probe_ok', at: Date.now() } : { type: 'probe_failed', at: Date.now(), error: error ?? 'probe failed' });
}

let failureListener: ((source: string) => void) | null = null;

/** Lo usa el monitor para disparar un probe inmediato tras un fallo de red. */
export function setKioskNetworkFailureListener(listener: ((source: string) => void) | null): void {
  failureListener = listener;
}

export function reportKioskNetworkFailure(source: string): void {
  dispatch({ type: 'request_failed', at: Date.now(), error: source });
  failureListener?.(source);
}

export function reportKioskNetworkSuccess(): void {
  dispatch({ type: 'request_ok', at: Date.now() });
}

/** El checkout ya sabe que no hay red (p.ej. la reserva falló por red): no esperar al probe. */
export function markKioskOffline(reason: string): void {
  dispatch({ type: 'force_offline', at: Date.now(), error: reason });
  failureListener?.(reason);
}

/** Modo mock/demo: siempre online, sin probes. */
export function pinKioskConnectivityOnline(pinned: boolean): void {
  pinnedOnline = pinned;
  if (pinned) {
    state = { ...INITIAL, status: 'online' };
    snapshot = toSnapshot(state);
    for (const listener of listeners) {
      listener(snapshot);
    }
  }
}

/** Solo tests. */
export function __resetKioskConnectivityForTests(): void {
  pinnedOnline = false;
  failureListener = null;
  state = { ...INITIAL };
  snapshot = toSnapshot(state);
  listeners.clear();
}
