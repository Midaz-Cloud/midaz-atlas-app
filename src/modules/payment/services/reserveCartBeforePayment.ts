import {
  createKioskApiClient,
  loadAccessToken,
  type CartReserveItemResult,
} from '@shared/api/kiosk';
import { getCatalogEntryByLineProductId } from '@shared/catalog/catalogStore';
import type { CartLine } from '@shared/kiosk-order/types';

export type ReserveCartBeforePaymentResult =
  | { ok: true; reservationId: string }
  | { ok: false; shortages: CartReserveItemResult[] };

const DEFAULT_TTL_MINUTES = 5;

export async function reserveCartBeforePayment(
  lines: CartLine[],
): Promise<ReserveCartBeforePaymentResult> {
  const items = lines
    .map((line) => {
      const entry = getCatalogEntryByLineProductId(line.productId);
      if (!entry) {
        return null;
      }
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
    return { ok: true, reservationId: response.reservationId };
  }

  const shortages = response.items.filter(
    (item) => !item.reserved || item.availableQuantity < item.requested,
  );

  return { ok: false, shortages };
}
