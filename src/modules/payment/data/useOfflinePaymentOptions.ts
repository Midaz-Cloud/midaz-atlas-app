import { useKioskConnectivity } from '@shared/connectivity';
import { useKioskSession } from '@shared/session';

/** Qué se puede cobrar según haya o no backend (lo usan la selección de método y el navigator). */
export function useOfflinePaymentOptions(): { offline: boolean; offlineCashAllowed: boolean } {
  const { status } = useKioskConnectivity();
  const { runtimeConfig } = useKioskSession();
  return {
    offline: status === 'offline',
    offlineCashAllowed: runtimeConfig?.raw.lanComanda?.allowCashOffline === true,
  };
}
