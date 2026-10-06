import { useSyncExternalStore } from 'react';

import { getOrderSyncSnapshot, subscribeOrderSync, type OrderSyncSnapshot } from './orderSyncWorker';

export function useOrderSyncStatus(): OrderSyncSnapshot {
  return useSyncExternalStore(subscribeOrderSync, getOrderSyncSnapshot, getOrderSyncSnapshot);
}
