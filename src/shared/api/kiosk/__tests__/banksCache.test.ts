import AsyncStorage from '@react-native-async-storage/async-storage';

import { filterBanks, loadBanks } from '../banksCache';
import type { KioskApiClient } from '../client';
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
