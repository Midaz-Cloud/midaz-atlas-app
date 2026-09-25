import { NativeModules, Platform } from 'react-native';

import { checkFiscalHealth } from './checkFiscalHealth';

export type EnsureFiscalReadyResult =
  | { ready: true }
  | { ready: false; reason: 'hka_not_installed' | 'printer_unavailable'; message: string };

type Deps = {
  isHealthy: () => Promise<boolean>;
  startFiscalService: () => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

const POLL_MS = 1_500;
export const FISCAL_READY_TIMEOUT_MS = 15_000;

async function isFiscalHealthy(): Promise<boolean> {
  try {
    const envelope = await checkFiscalHealth({ probeEnq: true });
    return envelope.success === true && envelope.data?.healthy === true;
  } catch {
    // Sin servicio (HkaApp cerrada): fetch falla.
    return false;
  }
}

/** Broadcast a HkaApp para que arranque su servicio y se conecte sola (ver KioskDeviceModule). */
export async function startHkaFiscalService(): Promise<boolean> {
  const native = NativeModules.KioskDeviceModule as
    | { startFiscalService?: () => Promise<boolean> }
    | undefined;
  if (Platform.OS !== 'android' || !native?.startFiscalService) {
    return false;
  }
  try {
    return await native.startFiscalService();
  } catch {
    return false;
  }
}

const defaultDeps: Deps = {
  isHealthy: isFiscalHealthy,
  startFiscalService: startHkaFiscalService,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

/**
 * Antes de cobrar con impresora fiscal: la factura se emite DESPUÉS del cobro, así
 * que si HkaApp no está lista el cliente pagaría sin poder facturar (pasó el
 * 25/09 tras reiniciar el kiosko). Si no responde, se le pide a HkaApp que arranque
 * y se reconecte, y se espera hasta `timeoutMs`; si igual no, no se cobra.
 */
export async function ensureFiscalReady(
  options: { timeoutMs?: number } = {},
  deps: Deps = defaultDeps,
): Promise<EnsureFiscalReadyResult> {
  if (await deps.isHealthy()) {
    return { ready: true };
  }
  const installed = await deps.startFiscalService();
  if (!installed && Platform.OS === 'android') {
    return {
      ready: false,
      reason: 'hka_not_installed',
      message: 'La app de la impresora fiscal (HkaApp) no está instalada en este kiosco.',
    };
  }
  const deadline = deps.now() + (options.timeoutMs ?? FISCAL_READY_TIMEOUT_MS);
  while (deps.now() < deadline) {
    await deps.sleep(POLL_MS);
    if (await deps.isHealthy()) {
      return { ready: true };
    }
  }
  return {
    ready: false,
    reason: 'printer_unavailable',
    message: 'La impresora fiscal no está disponible. Verifica que esté encendida y cerca del kiosco.',
  };
}
