import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KioskApiClient } from './client';
import type { KioskBank } from './types';

const BANKS_CACHE_KEY = '@kiosk/banksCache';
const BANKS_TTL_MS = 24 * 60 * 60 * 1000;

type BanksCacheEntry = {
  banks: KioskBank[];
  fetchedAt: number;
};

export function filterBanks(banks: KioskBank[], query: string): KioskBank[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return banks;
  }
  return banks.filter(
    (bank) =>
      bank.code.toLowerCase().includes(q) || bank.name.toLowerCase().includes(q),
  );
}

async function loadCachedBanks(): Promise<BanksCacheEntry | null> {
  const raw = await AsyncStorage.getItem(BANKS_CACHE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as BanksCacheEntry;
    if (!Array.isArray(parsed.banks) || typeof parsed.fetchedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function saveCachedBanks(banks: KioskBank[]): Promise<void> {
  const entry: BanksCacheEntry = { banks, fetchedAt: Date.now() };
  await AsyncStorage.setItem(BANKS_CACHE_KEY, JSON.stringify(entry));
}

/** Loads banks from cache when fresh; otherwise fetches and persists (24h TTL). */
export async function loadBanks(client: KioskApiClient): Promise<KioskBank[]> {
  const cached = await loadCachedBanks();
  if (cached && Date.now() - cached.fetchedAt < BANKS_TTL_MS) {
    return cached.banks;
  }
  const banks = await client.getBanks();
  await saveCachedBanks(banks);
  return banks;
}

export async function clearBanksCache(): Promise<void> {
  await AsyncStorage.removeItem(BANKS_CACHE_KEY);
}
