import type { CartReserveItemResult } from '@shared/api/kiosk';

export type PosChargePhase = 'waiting_pos' | 'confirming';

export type PosChargeResult =
  | { ok: true }
  | { ok: false; kind: 'payment-error' }
  /** La impresora fiscal no respondió: NO se cobró (la factura va después del cobro). */
  | { ok: false; kind: 'fiscal-unavailable'; message: string }
  | { ok: false; kind: 'stock-shortage'; shortages: CartReserveItemResult[] };
