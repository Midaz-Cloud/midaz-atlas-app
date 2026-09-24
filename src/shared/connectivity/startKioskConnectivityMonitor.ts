import { shouldUseMockApi } from '@shared/config/api';

import {
  getKioskConnectivity,
  pinKioskConnectivityOnline,
  reportKioskProbeResult,
  setKioskNetworkFailureListener,
} from './kioskConnectivityStore';
import { probeKioskGateway } from './probeKioskGateway';

export type KioskConnectivityMonitorOptions = {
  /** Cada cuánto se prueba el gateway estando online (default 30 s). */
  onlineIntervalMs?: number;
  /** Estando offline se prueba más seguido para volver rápido (default 15 s). */
  offlineIntervalMs?: number;
  /** Tras un fallo de red de negocio, espera mínima antes del probe inmediato (default 5 s). */
  failureProbeDebounceMs?: number;
  probeTimeoutMs?: number;
};

/**
 * Prueba el gateway periódicamente y ante cada fallo de red. Devuelve la función
 * para detenerlo. En modo mock el estado queda fijo en online.
 */
export function startKioskConnectivityMonitor(options: KioskConnectivityMonitorOptions = {}): () => void {
  if (shouldUseMockApi()) {
    pinKioskConnectivityOnline(true);
    return () => undefined;
  }

  const onlineIntervalMs = options.onlineIntervalMs ?? 30_000;
  const offlineIntervalMs = options.offlineIntervalMs ?? 15_000;
  const debounceMs = options.failureProbeDebounceMs ?? 5_000;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let probing = false;
  let lastProbeStartedAt = 0;

  const schedule = (delayMs: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void runProbe();
    }, delayMs);
  };

  const runProbe = async () => {
    if (stopped || probing) return;
    probing = true;
    lastProbeStartedAt = Date.now();
    try {
      const result = await probeKioskGateway({ timeoutMs: options.probeTimeoutMs });
      if (!stopped) {
        reportKioskProbeResult(result.ok, result.error);
      }
    } finally {
      probing = false;
      const offline = getKioskConnectivity().status === 'offline';
      schedule(offline ? offlineIntervalMs : onlineIntervalMs);
    }
  };

  setKioskNetworkFailureListener(() => {
    const sinceLast = Date.now() - lastProbeStartedAt;
    schedule(Math.max(0, debounceMs - sinceLast));
  });

  void runProbe();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    setKioskNetworkFailureListener(null);
  };
}
