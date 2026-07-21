import { shouldUseMockFiscal } from '@shared/config/fiscal';

import type { FiscalClient } from './FiscalClient';
import { HttpFiscalClient } from './HttpFiscalClient';
import { MockFiscalClient } from './MockFiscalClient';

let singleton: FiscalClient | null = null;

export function createFiscalClient(): FiscalClient {
  if (!singleton) {
    singleton = shouldUseMockFiscal() ? new MockFiscalClient() : new HttpFiscalClient();
  }
  return singleton;
}

export function resetFiscalClientForTests(): void {
  singleton = null;
}
