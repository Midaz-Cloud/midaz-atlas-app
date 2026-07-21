/** Formato visual del número de pedido en P14 (ej. K-000023 → #023). */
export function formatOrderDisplayNumber(orderId: string): string {
  const digits = orderId.replace(/\D/g, '');
  const suffix = digits.slice(-3).padStart(3, '0');
  return `#${suffix}`;
}
