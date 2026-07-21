import type { EcrClient } from './EcrClient';
import { MockEcrClient } from './MockEcrClient';
import { NativeEcrClient } from './NativeEcrClient';
import { shouldUseMockApi } from '@shared/config/api';

let singleton: EcrClient | null = null;

export function createEcrClient(): EcrClient {
  if (!singleton) {
    singleton = shouldUseMockApi() ? new MockEcrClient() : new NativeEcrClient();
  }
  return singleton;
}

export function resetEcrClientForTests(): void {
  singleton = null;
}
