import { useSyncExternalStore } from 'react';

import {
  getKioskConnectivity,
  subscribeKioskConnectivity,
  type KioskConnectivitySnapshot,
} from './kioskConnectivityStore';

export function useKioskConnectivity(): KioskConnectivitySnapshot {
  return useSyncExternalStore(subscribeKioskConnectivity, getKioskConnectivity, getKioskConnectivity);
}
