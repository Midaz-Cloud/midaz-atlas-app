import {
  createKioskApiClient,
  loadAccessToken,
  type CartReserveItemResult,
} from '@shared/api/kiosk';
import { getCatalogEntryByLineProductId } from '@shared/catalog/catalogStore';
import type { CartLine } from '@shared/kiosk-order/types';

/** Precio unitario congelado por el server, ya mapeado a la línea del carrito. */
export type ServerLinePrice = { lineId: string; unitPrice: number };

export type ReserveCartBeforePaymentResult =
  | { ok: true; reservationId: string; serverPrices: ServerLinePrice[] }
  | { ok: false; shortages: CartReserveItemResult[] };

const DEFAULT_TTL_MINUTES = 5;

export async function reserveCartBeforePayment(
  lines: CartLine[],
): Promise<ReserveCartBeforePaymentResult> {
  const lineByApiProductId = new Map<string, string[]>();
  const items = lines
    .map((line) => {
      const entry = getCatalogEntryByLineProductId(line.productId);
      if (!entry) {
        return null;
      }
      const key = String(entry.apiProductId);
      lineByApiProductId.set(key, [...(lineByApiProductId.get(key) ?? []), line.lineId]);
      return { productId: entry.apiProductId, quantity: line.quantity };
    })
    .filter((item): item is { productId: number; quantity: number } => item != null);

  if (items.length === 0) {
    throw new Error('No se pudo mapear el carrito para reservar stock');
  }

  const token = await loadAccessToken();
  const client = createKioskApiClient(token ?? undefined);
  const response = await client.reserveCart({ items, ttlMinutes: DEFAULT_TTL_MINUTES });

  if (response.allReserved && response.reservationId) {
    // Price lock: el server ya congeló estos precios contra el reservationId y con
    // ellos va a emitir la factura. El cobro tiene que usar los mismos, no los del
    // catálogo local (que puede estar hasta 60 s viejo).
    const serverPrices: ServerLinePrice[] = [];
    for (const item of response.items) {
      if (item.unitPrice == null || !Number.isFinite(item.unitPrice)) {
        continue;
      }
      for (const lineId of lineByApiProductId.get(String(item.productId)) ?? []) {
        serverPrices.push({ lineId, unitPrice: item.unitPrice });
      }
    }
    return { ok: true, reservationId: response.reservationId, serverPrices };
  }

  const shortages = response.items.filter(
    (item) => !item.reserved || item.availableQuantity < item.requested,
  );

  return { ok: false, shortages };
}
