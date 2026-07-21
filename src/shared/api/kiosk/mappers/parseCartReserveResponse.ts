import type { CartReserveResponse } from '../types';

function parseNumericField(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function parseCartReserveResponse(body: unknown): CartReserveResponse {
  const raw = body as Record<string, unknown>;
  const items = Array.isArray(raw.items)
    ? raw.items.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          productId: String(item.productId ?? ''),
          reserved: Boolean(item.reserved),
          availableQuantity: parseNumericField(item.availableQuantity),
          requested: parseNumericField(item.requested),
        };
      })
    : [];

  const reservationId =
    raw.reservationId != null && String(raw.reservationId).length > 0
      ? String(raw.reservationId)
      : null;

  return {
    reservationId,
    allReserved: Boolean(raw.allReserved),
    items,
  };
}
