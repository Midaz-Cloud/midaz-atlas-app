import { useSyncExternalStore } from 'react';

import {
  getLanComandaServerStatus,
  subscribeLanComandaServer,
  type LanComandaServerStatus,
} from './lanComandaServer';

export function useLanComandaServerStatus(): LanComandaServerStatus {
  return useSyncExternalStore(
    subscribeLanComandaServer,
    getLanComandaServerStatus,
    getLanComandaServerStatus,
  );
}
