import { isKioskDemoMode } from '@shared/config';

export type CashierAssistanceReason = 'reference' | 'fiscal_error' | 'payment';

export type CashierAssistanceRequest = {
  kioskId: string;
  sessionId: string;
  orderId?: string;
  reason: CashierAssistanceReason;
};

/** Mock P19 · push al administrador (sustituir por API real). */
export function requestCashierAssistance(request: CashierAssistanceRequest): void {
  if (isKioskDemoMode) {
    // eslint-disable-next-line no-console
    console.log('[P19] requestCashierAssistance (demo)', request);
  }
}
