import DeviceInfo from 'react-native-device-info';

import {
  getKioskConnectivity,
  isKioskOffline,
  subscribeKioskConnectivity,
} from '@shared/connectivity';
import {
  listLocalComandas,
  pruneLocalComandas,
  setOrderOutboxComandaStatus,
  updateLocalComandaStatus,
} from '@shared/persistence';
import { getOrderSyncSnapshot } from '@shared/sync';
import { requestKioskHeartbeatNow, setKioskTelemetryLanIp } from '@shared/telemetry';

import { handleLanRequest, type LanRouterDeps } from './lanComandaRouter';
import {
  LAN_REQUEST_EVENT,
  createLanEventEmitter,
  getLanComandaServerNative,
  type LanAddress,
  type LanNativeRequest,
} from './lanComandaServerModule';

export type LanComandaServerStatus = {
  running: boolean;
  port: number | null;
  addresses: LanAddress[];
  lastRequestAt: string | null;
  lastHeartbeatAt: string | null;
  error: string | null;
};

let status: LanComandaServerStatus = {
  running: false,
  port: null,
  addresses: [],
  lastRequestAt: null,
  lastHeartbeatAt: null,
  error: null,
};
const listeners = new Set<() => void>();

function setStatus(patch: Partial<LanComandaServerStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener());
}

export function getLanComandaServerStatus(): LanComandaServerStatus {
  return status;
}

export function subscribeLanComandaServer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** La IP que se anuncia: la de la Wi‑Fi si hay varias. */
export function pickLanIp(addresses: LanAddress[]): string | null {
  const wifi = addresses.find((a) => a.interface.startsWith('wlan'));
  return (wifi ?? addresses[0])?.address ?? null;
}

const HEARTBEAT_MS = 5 * 60_000;
const ADDRESS_CHECK_MS = 60_000;

export type StartLanComandaServerOptions = {
  port: number;
  sharedKey: string;
  deviceSerial: string | null;
};

/**
 * Levanta el servidor LAN y lo deja encendido toda la sesión (online u offline):
 * la Comandera no necesita saber si el kiosko tiene backend, normalmente recibe `[]`.
 * Devuelve la función para apagarlo.
 */
export function startLanComandaServer(options: StartLanComandaServerOptions): () => void {
  const native = getLanComandaServerNative();
  if (!native) {
    setStatus({ running: false, error: 'Módulo LAN no disponible en este APK' });
    return () => undefined;
  }

  const appVersion = safeAppVersion();
  const deps: LanRouterDeps = {
    now: () => new Date(),
    kioskSerial: options.deviceSerial,
    appVersion,
    isKioskOnline: () => !isKioskOffline(),
    pendingSync: () => getOrderSyncSnapshot().pending,
    listComandas: ({ since }) => listLocalComandas({ since }),
    updateComandaStatus: async (id, next) => {
      const updated = await updateLocalComandaStatus(id, next);
      if (updated) {
        // El estado de cocina viaja en la orden al sincronizar (comanda nace READY).
        await setOrderOutboxComandaStatus(updated.clientOrderId, updated.status).catch(() => undefined);
      }
      return updated;
    },
  };

  const emitter = createLanEventEmitter(native);
  const subscription = emitter.addListener(LAN_REQUEST_EVENT, (raw: LanNativeRequest) => {
    void (async () => {
      let response;
      try {
        response = await handleLanRequest(raw, deps);
      } catch (error) {
        response = {
          status: 500,
          body: { statusCode: 500, message: error instanceof Error ? error.message : 'internal_error' },
        };
      }
      setStatus({ lastRequestAt: new Date().toISOString() });
      await native
        .respond(raw.requestId, response.status, JSON.stringify(response.body), response.headers ?? null)
        .catch(() => false);
    })();
  });

  let stopped = false;
  let lastAnnouncedIp: string | null = null;

  const refreshAddresses = async (): Promise<string | null> => {
    const addresses = await native.getLanAddresses().catch(() => [] as LanAddress[]);
    setStatus({ addresses });
    return pickLanIp(addresses);
  };

  // El heartbeat en sí (HTTP + RAM/disco/fiscal/etc.) vive en
  // `@shared/telemetry` — es la MISMA fuente que usa el heartbeat periódico
  // independiente del servidor LAN (`startKioskTelemetryHeartbeat`), para no
  // tener dos payloads distintos reportando cosas distintas al backend.
  const sendHeartbeat = async (force = false) => {
    const lanIp = await refreshAddresses();
    if (stopped || isKioskOffline()) {
      return;
    }
    if (!force && lanIp === lastAnnouncedIp && status.lastHeartbeatAt) {
      const elapsed = Date.now() - new Date(status.lastHeartbeatAt).getTime();
      if (elapsed < HEARTBEAT_MS) {
        return;
      }
    }
    setKioskTelemetryLanIp(lanIp, true);
    const ok = await requestKioskHeartbeatNow();
    if (ok) {
      lastAnnouncedIp = lanIp;
      setStatus({ lastHeartbeatAt: new Date().toISOString() });
    }
  };

  void native
    .start(options.port, options.sharedKey)
    .then((port) => {
      setStatus({ running: true, port, error: null });
      void sendHeartbeat(true);
      void pruneLocalComandas().catch(() => 0);
    })
    .catch((error: unknown) => {
      setStatus({ running: false, error: error instanceof Error ? error.message : String(error) });
    });

  // Cada minuto revisa la IP (DHCP puede cambiarla) y manda heartbeat si cambió o pasaron 5 min.
  const interval = setInterval(() => {
    void sendHeartbeat();
  }, ADDRESS_CHECK_MS);

  // Al volver la conexión, avisar enseguida dónde está el kiosko.
  let lastConnectivity = getKioskConnectivity().status;
  const unsubscribeConnectivity = subscribeKioskConnectivity(() => {
    const next = getKioskConnectivity().status;
    if (lastConnectivity === 'offline' && next !== 'offline') {
      void sendHeartbeat(true);
    }
    lastConnectivity = next;
  });

  return () => {
    stopped = true;
    clearInterval(interval);
    unsubscribeConnectivity();
    subscription.remove();
    void native.stop().catch(() => undefined);
    setStatus({ running: false, port: null });
    setKioskTelemetryLanIp(null, false);
  };
}

function safeAppVersion(): string | null {
  try {
    return DeviceInfo.getVersion();
  } catch {
    return null;
  }
}
