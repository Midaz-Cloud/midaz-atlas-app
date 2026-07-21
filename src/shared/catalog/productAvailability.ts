export type ProductAvailabilityInput = {
  isActive?: boolean;
  stock?: number;
  available?: number;
  isAvailable?: boolean;
};

/** Stock disponible (físico menos reservas activas). */
export function resolveProductAvailable(input: ProductAvailabilityInput): number {
  const available = input.available ?? input.stock ?? 0;
  return Math.max(0, available);
}

/** Si el producto puede agregarse al carrito según disponibilidad del API. */
export function isProductAvailableForSale(input: ProductAvailabilityInput): boolean {
  if (input.isActive === false) {
    return false;
  }
  if (typeof input.isAvailable === 'boolean') {
    return input.isAvailable;
  }
  return resolveProductAvailable(input) > 0;
}

export function isProductSoldOut(input: ProductAvailabilityInput): boolean {
  return !isProductAvailableForSale(input);
}
