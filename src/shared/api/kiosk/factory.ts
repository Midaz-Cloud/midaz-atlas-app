import { shouldUseMockApi } from '@shared/config';

import type { KioskApiClient } from './client';
import { HttpKioskApiClient } from './http/HttpKioskApiClient';
import { MockKioskApiClient } from './mock/MockKioskApiClient';

let mockSingleton: MockKioskApiClient | null = null;

export function createKioskApiClient(accessToken?: string): KioskApiClient {
  if (shouldUseMockApi()) {
    if (!mockSingleton) {
      mockSingleton = new MockKioskApiClient();
    }
    return mockSingleton;
  }
  return new HttpKioskApiClient(accessToken ?? '');
}

export function resetKioskApiClientForTests(): void {
  mockSingleton = null;
}
