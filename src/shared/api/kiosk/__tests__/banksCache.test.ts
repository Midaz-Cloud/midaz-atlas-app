import AsyncStorage from '@react-native-async-storage/async-storage';

import { filterBanks, loadBanks } from '../banksCache';
import type { KioskApiClient } from '../client';
import { FALLBACK_BANKS } from '../banksFallback';
import type { KioskBank } from '../types';

const banks: KioskBank[] = [
  { code: '0134', name: 'Banesco' },
  { code: '0171', name: 'Banco Activo' },
];

describe('banksCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('filters banks by code or name', () => {
    expect(filterBanks(banks, 'activo')).toEqual([{ code: '0171', name: 'Banco Activo' }]);
    expect(filterBanks(banks, '0134')).toHaveLength(1);
    expect(filterBanks(banks, '')).toEqual(banks);
  });

  it('loads from API when cache is empty', async () => {
    const client: Pick<KioskApiClient, 'getBanks'> = {
      getBanks: jest.fn().mockResolvedValue(banks),
    };
    const result = await loadBanks(client as KioskApiClient);
    expect(result).toEqual(banks);
    expect(client.getBanks).toHaveBeenCalledTimes(1);
  });
});

describe('banksCache sin lista vacía', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('usa el catálogo de respaldo si el backend falla y no hay caché', async () => {
    const client = { getBanks: jest.fn().mockRejectedValue(new Error('timeout')) };
    const result = await loadBanks(client as unknown as KioskApiClient);
    expect(result).toBe(FALLBACK_BANKS);
    expect(result.length).toBeGreaterThan(20);
  });

  it('no guarda una lista vacía y vuelve a preguntar la próxima vez', async () => {
    const client = { getBanks: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(banks) };
    expect(await loadBanks(client as unknown as KioskApiClient)).toBe(FALLBACK_BANKS);
    expect(await loadBanks(client as unknown as KioskApiClient)).toEqual(banks);
    expect(client.getBanks).toHaveBeenCalledTimes(2);
  });

  it('ignora una caché vacía vigente (de versiones anteriores)', async () => {
    await AsyncStorage.setItem('@kiosk/banksCache', JSON.stringify({ banks: [], fetchedAt: Date.now() }));
    const client = { getBanks: jest.fn().mockResolvedValue(banks) };
    expect(await loadBanks(client as unknown as KioskApiClient)).toEqual(banks);
  });

  it('usa la caché vencida si el backend falla', async () => {
    await AsyncStorage.setItem('@kiosk/banksCache', JSON.stringify({ banks, fetchedAt: 0 }));
    const client = { getBanks: jest.fn().mockRejectedValue(new Error('500')) };
    expect(await loadBanks(client as unknown as KioskApiClient)).toEqual(banks);
  });
});
