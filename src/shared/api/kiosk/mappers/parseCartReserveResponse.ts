import type { CartReserveResponse } from '../types';

/** Precio unitario congelado por el server. `null` = el backend no lo mandó. */
function parseUnitPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

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
          // Ojo: este parser reconstruye el ítem campo por campo, así que todo lo
          // que el backend agregue hay que sumarlo acá o se pierde en silencio
          // (le pasó al price lock: `unitPrice` llegaba y se descartaba).
          unitPrice: parseUnitPrice(item.unitPrice),
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
