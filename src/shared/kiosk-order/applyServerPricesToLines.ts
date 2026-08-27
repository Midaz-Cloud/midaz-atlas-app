import type { CartLine } from './types';

export type ServerUnitPrice = { lineId: string; unitPrice: number };

/**
 * Reemplaza el precio base de las líneas por el que congeló el server al reservar
 * (price lock). Puro a propósito: el cobro con tarjeta necesita el total corregido
 * en el mismo tick, sin esperar a que React propague el estado del carrito.
 *
 * Conserva la tasa USD→VES que ya tenía cada línea: solo cambia la base.
 */
export function applyServerPricesToLines(
  lines: CartLine[],
  prices: ServerUnitPrice[],
): CartLine[] {
  if (prices.length === 0) {
    return lines;
  }
  const byLineId = new Map(prices.map((p) => [p.lineId, p.unitPrice]));
  return lines.map((line) => {
    const serverPrice = byLineId.get(line.lineId);
    if (serverPrice == null || serverPrice === line.unitPrice) {
      return line;
    }
    const unitPriceVes =
      line.unitPriceVes != null && line.unitPrice > 0
        ? (line.unitPriceVes / line.unitPrice) * serverPrice
        : line.unitPriceVes;
    return { ...line, unitPrice: serverPrice, unitPriceVes };
  });
}
