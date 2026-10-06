import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

import { collectKioskRuntimeHealth, formatUptime } from '../kioskRuntimeHealth';
import {
  __resetKioskRuntimeHealthHistoryForTests,
  clearKioskRuntimeHealthHistory,
  loadKioskRuntimeHealthHistory,
  recordKioskRuntimeHealthSample,
  RUNTIME_HEALTH_MAX_SAMPLES,
} from '../kioskRuntimeHealthHistory';

type GlobalWithHermes = typeof globalThis & {
  HermesInternal?: { getInstrumentedStats?: () => Record<string, unknown> };
};

describe('collectKioskRuntimeHealth', () => {
  const originalHermes = (globalThis as GlobalWithHermes).HermesInternal;

  afterEach(() => {
    (globalThis as GlobalWithHermes).HermesInternal = originalHermes;
    delete (NativeModules as Record<string, unknown>).KioskDeviceModule;
  });

  it('reads Hermes heap + native PSS and converts to MB', async () => {
    (globalThis as GlobalWithHermes).HermesInternal = {
      getInstrumentedStats: () => ({
        js_allocatedBytes: 42 * 1024 * 1024,
        js_heapSize: 96 * 1024 * 1024,
        js_numGCs: 17,
      }),
    };
    (NativeModules as Record<string, unknown>).KioskDeviceModule = {
      getProcessMemory: jest.fn(async () => ({
        pssKb: 310 * 1024,
        nativeHeapKb: 120 * 1024,
        javaHeapKb: 40 * 1024,
        systemAvailKb: 512 * 1024,
        systemTotalKb: 2048 * 1024,
        lowMemory: false,
        processUptimeMs: 3 * 3_600_000 + 5 * 60_000,
      })),
    };

    const sample = await collectKioskRuntimeHealth(new Date('2026-09-29T10:00:00.000Z'));

    expect(sample.at).toBe('2026-09-29T10:00:00.000Z');
    expect(sample.jsHeapUsedMb).toBe(42);
    expect(sample.jsHeapSizeMb).toBe(96);
    expect(sample.jsGcCount).toBe(17);
    expect(sample.pssMb).toBe(310);
    expect(sample.nativeHeapMb).toBe(120);
    expect(sample.javaHeapMb).toBe(40);
    expect(sample.systemAvailMb).toBe(512);
    expect(sample.systemLowMemory).toBe(false);
    expect(sample.appUptimeSec).toBe(3 * 3_600 + 5 * 60);
  });

  it('never throws: without Hermes stats or native module everything is null and uptime falls back to JS', async () => {
    (globalThis as GlobalWithHermes).HermesInternal = undefined;

    const sample = await collectKioskRuntimeHealth();

    expect(sample.jsHeapUsedMb).toBeNull();
    expect(sample.pssMb).toBeNull();
    expect(sample.systemLowMemory).toBeNull();
    expect(sample.appUptimeSec).toBeGreaterThanOrEqual(0);
  });

  it('survives a native module that rejects', async () => {
    (NativeModules as Record<string, unknown>).KioskDeviceModule = {
      getProcessMemory: jest.fn(async () => {
        throw new Error('boom');
      }),
    };

    const sample = await collectKioskRuntimeHealth();
    expect(sample.pssMb).toBeNull();
  });
});

describe('formatUptime', () => {
  it('formats minutes, hours and days', () => {
    expect(formatUptime(null)).toBe('—');
    expect(formatUptime(12 * 60)).toBe('12m');
    expect(formatUptime(4 * 3_600 + 5 * 60)).toBe('4h 05m');
    expect(formatUptime(3 * 86_400 + 4 * 3_600 + 5 * 60)).toBe('3d 4h 05m');
  });
});

describe('kioskRuntimeHealthHistory', () => {
  const sample = (i: number) => ({
    at: new Date(Date.UTC(2026, 8, 29, 0, i)).toISOString(),
    appUptimeSec: i * 300,
    jsHeapUsedMb: 10 + i,
    jsHeapSizeMb: 50,
    jsGcCount: i,
    pssMb: 200 + i,
    nativeHeapMb: null,
    javaHeapMb: null,
    systemAvailMb: 600 - i,
    systemLowMemory: false,
  });

  beforeEach(async () => {
    __resetKioskRuntimeHealthHistoryForTests();
    await AsyncStorage.clear();
  });

  it('appends samples, persists them and keeps only the last 24 h window', async () => {
    for (let i = 0; i < RUNTIME_HEALTH_MAX_SAMPLES + 5; i += 1) {
      await recordKioskRuntimeHealthSample(sample(i));
    }

    const history = await loadKioskRuntimeHealthHistory();
    expect(history).toHaveLength(RUNTIME_HEALTH_MAX_SAMPLES);
    expect(history[0]?.jsGcCount).toBe(5);
    expect(history[history.length - 1]?.jsGcCount).toBe(RUNTIME_HEALTH_MAX_SAMPLES + 4);

    // Otra sesión (caché vacía) lo lee de disco.
    __resetKioskRuntimeHealthHistoryForTests();
    const reloaded = await loadKioskRuntimeHealthHistory();
    expect(reloaded).toHaveLength(RUNTIME_HEALTH_MAX_SAMPLES);
  });

  it('ignores corrupt storage and clears on demand', async () => {
    await AsyncStorage.setItem('@kiosk/runtimeHealth/v1', '{not json');
    expect(await loadKioskRuntimeHealthHistory()).toEqual([]);

    await recordKioskRuntimeHealthSample(sample(1));
    expect(await loadKioskRuntimeHealthHistory()).toHaveLength(1);

    await clearKioskRuntimeHealthHistory();
    expect(await loadKioskRuntimeHealthHistory()).toEqual([]);
    expect(await AsyncStorage.getItem('@kiosk/runtimeHealth/v1')).toBeNull();
  });
});
