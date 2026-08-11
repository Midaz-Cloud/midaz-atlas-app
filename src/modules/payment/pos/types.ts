import type { CartReserveItemResult } from '@shared/api/kiosk';

export type PosChargePhase = 'waiting_pos' | 'confirming';

export type PosChargeResult =
  | { ok: true }
  | { ok: false; kind: 'payment-error' }
  | { ok: false; kind: 'stock-shortage'; shortages: CartReserveItemResult[] };
