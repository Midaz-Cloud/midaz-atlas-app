import { computeOrderTotals } from '../../hooks/useOrderTotals';
import { mockCartLines } from './mockCartLines';

/** Totales de ejemplo para Storybook (mockCartLines, sin IGTF). */
export const mockOrderTotals = computeOrderTotals(mockCartLines);

/** Totales con IGTF para story dedicada. */
export const mockOrderTotalsWithIgtf = computeOrderTotals(mockCartLines, undefined, {
  applyIgtf: true,
});
