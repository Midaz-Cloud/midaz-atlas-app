import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';

import type { CartLine } from '@shared/kiosk-order/types';
import { resolveAppliedModifiersFromSelections } from '@shared/modifiers/resolveAppliedModifiers';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Surcharge stored on the line, or recomputed from selections for mocks/legacy rows. */
export function resolveCartLineModifierSurcharge(
  line: CartLine,
  modifierGroups?: ProductModifierGroup[],
): number {
  if (line.modifierSurchargePrimary != null) {
    return line.modifierSurchargePrimary;
  }
  if (!modifierGroups?.length || !line.modifierSelections?.length) {
    return 0;
  }
  return resolveAppliedModifiersFromSelections(modifierGroups, line.modifierSelections)
    .surcharge;
}

export function cartLineTotalPrimary(line: CartLine, modifierSurcharge: number): number {
  return roundMoney(line.unitPrice * line.quantity + modifierSurcharge);
}

/** All-in unit price (base + modifiers) shown on cart lines. */
export function cartLineDisplayUnitPrice(line: CartLine, modifierSurcharge: number): number {
  if (line.quantity <= 0) {
    return line.unitPrice;
  }
  return roundMoney(cartLineTotalPrimary(line, modifierSurcharge) / line.quantity);
}
