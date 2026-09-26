import { withKioskAuth } from '@shared/api/kiosk';
import { shouldUseMockApi } from '@shared/config/api';

import { collectKioskTelemetry } from './kioskTelemetry';

const HEARTBEAT_MS = 5 * 60_000;

type Context = {
  sessionMode: 'online' | 'offline';
  requiresFiscalPrinter: boolean;
  lanIp: string | null;
  lanRunning: boolean;
};

let context: Context = {
  sessionMode: 'offline',
  requiresFiscalPrinter: false,
  lanIp: null,
  lanRunning: false,
};
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight: Promise<boolean> | null = null;
let started = false;

/**
 * El servidor LAN descubre/actualiza la IP local (DHCP puede cambiarla) y si
 * está encendido — se pasan acá para que el heartbeat unificado los incluya
 * sin que `@shared/lan` y `@shared/telemetry` tengan que importarse mutuamente.
 */
export function setKioskTelemetryLanIp(lanIp: string | null, lanRunning = true): void {
  context = { ...context, lanIp, lanRunning };
}

export function setKioskTelemetrySessionMode(sessionMode: 'online' | 'offline'): void {
  context = { ...context, sessionMode };
}

/**
 * Manda el heartbeat ahora (fuera de ciclo): usado por el servidor LAN cuando
 * cambia la IP o vuelve la red, y por el arranque/cada 5 min de acá mismo.
 * Silencioso ante fallos — es solo telemetría, nunca debe interrumpir nada.
 * Devuelve `true` si se mandó bien (el servidor LAN lo usa para no marcar
 * `lastHeartbeatAt` en un intento que en realidad falló).
 */
export async function requestKioskHeartbeatNow(): Promise<boolean> {
  if (shouldUseMockApi()) {
    return false;
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    try {
      const telemetry = await collectKioskTelemetry({
        requiresFiscalPrinter: context.requiresFiscalPrinter,
        sessionMode: context.sessionMode,
        lanRunning: context.lanRunning,
      });
      await withKioskAuth((client) =>
        client.sendHeartbeat({
          lanIp: context.lanIp ?? undefined,
          appVersion: telemetry.appVersion ?? undefined,
          pendingSync: telemetry.sync.pending,
          failedSync: telemetry.sync.failed,
          openFailedPayments: telemetry.sync.openFailedPayments,
          device: telemetry.device,
          network: telemetry.network,
          fiscal: telemetry.fiscal,
          lan: telemetry.lan,
          catalog: telemetry.catalog,
          sessionMode: telemetry.sessionMode,
        }),
      );
      return true;
    } catch {
      // Solo telemetría — nunca bloquea ni reintenta agresivamente, el próximo
      // tick de 5 min (o el próximo evento de red) lo vuelve a intentar.
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export type StartKioskTelemetryHeartbeatOptions = {
  requiresFiscalPrinter: boolean;
  sessionMode: 'online' | 'offline';
};

/**
 * Heartbeat de telemetría INDEPENDIENTE del servidor LAN: manda RAM/disco/
 * red/fiscal/sync al backend al arrancar y cada 5 min, sin importar si
 * el servidor LAN de comandas está encendido (antes solo se mandaba heartbeat
 * cuando lo estaba, dejando kioskos sin reportar si lanComanda.enabled=false).
 */
export function startKioskTelemetryHeartbeat(
  options: StartKioskTelemetryHeartbeatOptions,
): () => void {
  context = { ...context, requiresFiscalPrinter: options.requiresFiscalPrinter, sessionMode: options.sessionMode };

  if (started) {
    // Ya hay un timer corriendo (p.ej. remount de KioskSessionProvider en tests);
    // solo se actualizó el contexto arriba.
    return () => undefined;
  }
  started = true;

  void requestKioskHeartbeatNow();
  timer = setInterval(() => {
    void requestKioskHeartbeatNow();
  }, HEARTBEAT_MS);

  return () => {
    started = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
