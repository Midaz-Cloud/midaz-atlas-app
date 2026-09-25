import DeviceInfo from 'react-native-device-info';

import { getCatalogProducts } from '@shared/catalog/catalogStore';
import { getKioskConnectivity, type KioskConnectivityStatus } from '@shared/connectivity';
import { listFailedPaymentRecordsByStatus } from '@shared/persistence';
import { getOrderSyncSnapshot } from '@shared/sync';
import { checkFiscalHealth } from '@shared/peripherals/fiscal/checkFiscalHealth';

export type KioskTelemetryDevice = {
  memTotalMb: number | null;
  memAvailableMb: number | null;
  diskFreeMb: number | null;
  diskTotalMb: number | null;
};

export type KioskTelemetrySnapshot = {
  appVersion: string | null;
  device: KioskTelemetryDevice;
  network: { status: KioskConnectivityStatus };
  /** `null` en orgs de facturación 100% digital — no aplica impresora fiscal. */
  fiscal: { healthy: boolean } | null;
  lan: { running: boolean };
  sync: { pending: number; failed: number; openFailedPayments: number };
  catalog: { products: number };
  sessionMode: 'online' | 'offline';
};

const BYTES_PER_MB = 1024 * 1024;

function toMb(bytes: number): number {
  return Math.round(bytes / BYTES_PER_MB);
}

async function collectDevice(): Promise<KioskTelemetryDevice> {
  const result: KioskTelemetryDevice = {
    memTotalMb: null,
    memAvailableMb: null,
    diskFreeMb: null,
    diskTotalMb: null,
  };
  // Cada lectura por separado: una API no soportada en este dispositivo/OEM no
  // debe tirar abajo el resto del reporte (ver logFiscal.ts para el mismo patrón).
  // Sin batería: el AF910 es fijo, va siempre enchufado a corriente.
  await Promise.all([
    DeviceInfo.getTotalMemory()
      .then((bytes) => {
        result.memTotalMb = toMb(bytes);
      })
      .catch(() => undefined),
    DeviceInfo.getUsedMemory()
      .then((bytes) => {
        if (result.memTotalMb != null) {
          result.memAvailableMb = Math.max(0, result.memTotalMb - toMb(bytes));
        }
      })
      .catch(() => undefined),
    DeviceInfo.getFreeDiskStorage()
      .then((bytes) => {
        result.diskFreeMb = toMb(bytes);
      })
      .catch(() => undefined),
    DeviceInfo.getTotalDiskCapacity()
      .then((bytes) => {
        result.diskTotalMb = toMb(bytes);
      })
      .catch(() => undefined),
  ]);
  return result;
}

async function collectFiscal(requiresFiscalPrinter: boolean): Promise<{ healthy: boolean } | null> {
  if (!requiresFiscalPrinter) {
    return null;
  }
  try {
    const envelope = await checkFiscalHealth({ probeEnq: false });
    return { healthy: envelope.success === true && envelope.data?.healthy === true };
  } catch {
    return { healthy: false };
  }
}

async function collectOpenFailedPayments(): Promise<number> {
  try {
    const rows = await listFailedPaymentRecordsByStatus('open');
    return rows.length;
  } catch {
    return 0;
  }
}

function safeAppVersion(): string | null {
  try {
    return DeviceInfo.getVersion();
  } catch {
    return null;
  }
}

/**
 * Junta el estado del kiosko (RAM/disco, red, fiscal, LAN, sync, catálogo)
 * para el heartbeat. Cada fuente se lee en su propio try/catch — una falla
 * (p.ej. HkaApp cerrada) nunca vacía el resto del reporte.
 */
export async function collectKioskTelemetry(options: {
  requiresFiscalPrinter: boolean;
  sessionMode: 'online' | 'offline';
  /** El servidor LAN vive en `@shared/lan`, que a su vez dispara este heartbeat
   *  (ver `startLanComandaServer`) — se pasa el estado en vez de importarlo acá
   *  para no crear un ciclo entre `@shared/telemetry` y `@shared/lan`. */
  lanRunning: boolean;
}): Promise<KioskTelemetrySnapshot> {
  const [device, fiscal, openFailedPayments] = await Promise.all([
    collectDevice(),
    collectFiscal(options.requiresFiscalPrinter),
    collectOpenFailedPayments(),
  ]);

  const syncSnapshot = getOrderSyncSnapshot();
  const connectivity = getKioskConnectivity();

  return {
    appVersion: safeAppVersion(),
    device,
    network: { status: connectivity.status },
    fiscal,
    lan: { running: options.lanRunning },
    sync: {
      pending: syncSnapshot.pending,
      failed: syncSnapshot.failed,
      openFailedPayments,
    },
    catalog: { products: getCatalogProducts().length },
    sessionMode: options.sessionMode,
  };
}
