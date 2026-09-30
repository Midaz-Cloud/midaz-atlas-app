import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KioskRuntimeHealth } from './kioskRuntimeHealth';

const HISTORY_KEY = '@kiosk/runtimeHealth/v1';
/** Una toma cada 5 min (heartbeat) → 288 = últimas 24 h. */
export const RUNTIME_HEALTH_MAX_SAMPLES = 288;

let cache: KioskRuntimeHealth[] | null = null;
let writeChain: Promise<void> = Promise.resolve();

function isSample(value: unknown): value is KioskRuntimeHealth {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as KioskRuntimeHealth).at === 'string'
  );
}

/**
 * Historial local de salud del proceso, en el propio equipo: el backend solo
 * guarda la última toma, así que sin esto no hay forma de ver cómo evolucionó
 * la memoria durante las horas que el kiosko estuvo solo. Se lee desde el
 * menú admin (Salud del equipo).
 */
export async function loadKioskRuntimeHealthHistory(): Promise<KioskRuntimeHealth[]> {
  if (cache) {
    return cache;
  }
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isSample) : [];
  } catch {
    cache = [];
  }
  return cache;
}

export async function recordKioskRuntimeHealthSample(sample: KioskRuntimeHealth): Promise<void> {
  const history = await loadKioskRuntimeHealthHistory();
  const next = [...history, sample].slice(-RUNTIME_HEALTH_MAX_SAMPLES);
  cache = next;
  writeChain = writeChain
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)))
    .catch(() => undefined);
  await writeChain;
}

export async function clearKioskRuntimeHealthHistory(): Promise<void> {
  cache = [];
  writeChain = writeChain
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(HISTORY_KEY))
    .catch(() => undefined);
  await writeChain;
}

/** Solo tests. */
export function __resetKioskRuntimeHealthHistoryForTests(): void {
  cache = null;
  writeChain = Promise.resolve();
}
