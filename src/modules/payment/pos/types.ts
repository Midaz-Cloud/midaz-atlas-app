import type { CartReserveItemResult } from '@shared/api/kiosk';

export type PosChargePhase = 'waiting_pos' | 'confirming';

export type PosChargeResult =
  | { ok: true }
  | { ok: false; kind: 'payment-error' }
  /**
   * El POS no dejó claro el cobro (`unconfirmed`) o no lo ejecutó porque el anterior
   * sigue pendiente (`previous_pending`). En ambos casos no se ofrece reintentar.
   */
  | { ok: false; kind: 'pos-uncertain'; outcome: 'unconfirmed' | 'previous_pending' }
  /** La impresora fiscal no respondió: NO se cobró (la factura va después del cobro). */
  | { ok: false; kind: 'fiscal-unavailable'; message: string }
  | { ok: false; kind: 'stock-shortage'; shortages: CartReserveItemResult[] };
