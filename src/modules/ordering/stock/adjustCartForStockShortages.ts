import type { CartReserveItemResult } from '@shared/api/kiosk';
import { getApiProductId } from '@shared/catalog/catalogStore';
import type { CartLine } from '@shared/kiosk-order/types';

export type AdjustCartForShortagesHandlers = {
  decrementLine: (lineId: string) => void;
  removeLine: (lineId: string) => void;
};

/** Ajusta cantidades o elimina líneas según availableQuantity del reserve. */
export function adjustCartForStockShortages(
  lines: CartLine[],
  shortages: CartReserveItemResult[],
  handlers: AdjustCartForShortagesHandlers,
): void {
  for (const shortage of shortages) {
    const apiId = Number.parseInt(shortage.productId, 10);
    const line = lines.find((row) => {
      const catalogApiId = getApiProductId(row.productId);
      return catalogApiId === apiId || row.productId === shortage.productId;
    });
    if (!line) {
      continue;
    }
    if (shortage.availableQuantity <= 0) {
      handlers.removeLine(line.lineId);
      continue;
    }
    const delta = line.quantity - shortage.availableQuantity;
    for (let i = 0; i < delta; i += 1) {
      handlers.decrementLine(line.lineId);
    }
  }
}
