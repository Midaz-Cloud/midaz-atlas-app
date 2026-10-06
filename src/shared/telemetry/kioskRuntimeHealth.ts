import { NativeModules } from 'react-native';

/**
 * Salud en tiempo real del proceso del kiosko. Complementa a `collectDevice()`
 * (RAM/disco del equipo) con lo que hace falta para diagnosticar "se pone lento
 * después de horas": memoria del proceso (PSS), heap de Hermes y uptime.
 * Cada fuente se lee en su propio try/catch y devuelve `null` si no está.
 */
export type KioskRuntimeHealth = {
  /** ISO de la toma. */
  at: string;
  /** Segundos desde que arrancó el proceso (o el bundle JS si el nativo no lo sabe). */
  appUptimeSec: number | null;
  /** Bytes vivos en el heap de Hermes (`js_allocatedBytes`), en MB. */
  jsHeapUsedMb: number | null;
  /** Tamaño reservado del heap de Hermes (`js_heapSize`), en MB. */
  jsHeapSizeMb: number | null;
  /** GCs acumulados del proceso. */
  jsGcCount: number | null;
  /** PSS total del proceso (lo que `dumpsys meminfo` llama TOTAL PSS), en MB. */
  pssMb: number | null;
  nativeHeapMb: number | null;
  javaHeapMb: number | null;
  /** RAM disponible del sistema según ActivityManager, en MB. */
  systemAvailMb: number | null;
  /** Android ya está en umbral de memoria baja (mata procesos de fondo). */
  systemLowMemory: boolean | null;
};

type HermesInstrumentedStats = Record<string, unknown>;

type HermesInternalLike = {
  getInstrumentedStats?: () => HermesInstrumentedStats;
};

type ProcessMemoryNative = {
  pssKb?: number;
  nativeHeapKb?: number;
  javaHeapKb?: number;
  systemAvailKb?: number;
  systemTotalKb?: number;
  lowMemory?: boolean;
  processUptimeMs?: number;
};

type KioskDeviceNativeModule = {
  getProcessMemory?: () => Promise<ProcessMemoryNative>;
};

const KB_PER_MB = 1024;
const BYTES_PER_MB = 1024 * 1024;

/** Referencia por si el nativo no expone el arranque del proceso. */
const JS_STARTED_AT = Date.now();

function roundMb(value: number): number {
  return Math.round(value * 10) / 10;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readHermesStats(): Pick<KioskRuntimeHealth, 'jsHeapUsedMb' | 'jsHeapSizeMb' | 'jsGcCount'> {
  const empty = { jsHeapUsedMb: null, jsHeapSizeMb: null, jsGcCount: null };
  try {
    const hermes = (globalThis as { HermesInternal?: HermesInternalLike }).HermesInternal;
    const stats = hermes?.getInstrumentedStats?.();
    if (!stats) {
      return empty;
    }
    const allocated = numberOrNull(stats.js_allocatedBytes);
    const heapSize = numberOrNull(stats.js_heapSize);
    const gcs = numberOrNull(stats.js_numGCs);
    return {
      jsHeapUsedMb: allocated == null ? null : roundMb(allocated / BYTES_PER_MB),
      jsHeapSizeMb: heapSize == null ? null : roundMb(heapSize / BYTES_PER_MB),
      jsGcCount: gcs == null ? null : Math.round(gcs),
    };
  } catch {
    return empty;
  }
}

function getDeviceNativeModule(): KioskDeviceNativeModule | null {
  // Sin gate por Platform: si el módulo existe se usa; si no (iOS, Jest), null.
  const mod = (NativeModules as { KioskDeviceModule?: KioskDeviceNativeModule }).KioskDeviceModule;
  return mod?.getProcessMemory ? mod : null;
}

async function readProcessMemory(): Promise<ProcessMemoryNative | null> {
  const mod = getDeviceNativeModule();
  if (!mod?.getProcessMemory) {
    return null;
  }
  try {
    return await mod.getProcessMemory();
  } catch {
    return null;
  }
}

function kbToMb(value: number | undefined): number | null {
  const kb = numberOrNull(value);
  return kb == null ? null : roundMb(kb / KB_PER_MB);
}

export async function collectKioskRuntimeHealth(now: Date = new Date()): Promise<KioskRuntimeHealth> {
  const hermes = readHermesStats();
  const native = await readProcessMemory();
  const nativeUptimeMs = numberOrNull(native?.processUptimeMs);
  const appUptimeSec =
    nativeUptimeMs != null && nativeUptimeMs >= 0
      ? Math.round(nativeUptimeMs / 1000)
      : Math.max(0, Math.round((now.getTime() - JS_STARTED_AT) / 1000));

  return {
    at: now.toISOString(),
    appUptimeSec,
    ...hermes,
    pssMb: kbToMb(native?.pssKb),
    nativeHeapMb: kbToMb(native?.nativeHeapKb),
    javaHeapMb: kbToMb(native?.javaHeapKb),
    systemAvailMb: kbToMb(native?.systemAvailKb),
    systemLowMemory: typeof native?.lowMemory === 'boolean' ? native.lowMemory : null,
  };
}

/** Segundos → "3d 4h 05m" / "4h 05m" / "12m". */
export function formatUptime(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const mm = String(minutes).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${hours}h ${mm}m`;
  }
  if (hours > 0) {
    return `${hours}h ${mm}m`;
  }
  return `${minutes}m`;
}
