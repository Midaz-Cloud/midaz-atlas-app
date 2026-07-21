import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';

import type { KioskOrderModifierSelection } from '@shared/api/kiosk/types';
import type { ModifierOptionQuantity } from '@shared/modifiers/modifierSelectionTypes';
import { expandOptionQuantitiesToSlotIds } from '@shared/modifiers/modifierSelectionTypes';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Count of selections at $0 before paid pricing applies.
 * - quotaFree 0 → none free (each option uses additionalPrice / excessPrice).
 * - quotaFree 1+ → (quotaFree + 1) free slots (guide: 1 → first 2 free, then excess).
 */
export function freeModifierSlots(quotaFree: number): number {
  if (quotaFree <= 0) {
    return 0;
  }
  return quotaFree + 1;
}

export function priceDeltaForPaidModifierOption(
  additionalPrice: number,
  excessPrice: number,
): number {
  if (excessPrice <= 0) {
    return roundMoney(additionalPrice);
  }
  return roundMoney(Math.min(additionalPrice, excessPrice));
}

type PricedSlot = {
  optionId: string;
  priceDelta: number;
};

function priceSlotsForGroup(
  group: ProductModifierGroup,
  slotOptionIds: string[],
): PricedSlot[] {
  const optionById = new Map(group.options.map((option) => [option.id, option]));
  const freeSlots = freeModifierSlots(group.quotaFree);

  return slotOptionIds.map((optionId, index) => {
    const option = optionById.get(optionId);
    const additionalPrice = option?.additionalPrice ?? 0;
    const isFree = index < freeSlots;
    const priceDelta = isFree
      ? 0
      : priceDeltaForPaidModifierOption(additionalPrice, group.excessPrice);
    return { optionId, priceDelta };
  });
}

function aggregatePricedSlots(
  group: ProductModifierGroup,
  pricedSlots: PricedSlot[],
): KioskOrderModifierSelection[] {
  const optionById = new Map(group.options.map((option) => [option.id, option]));
  const aggregated = new Map<string, KioskOrderModifierSelection>();

  for (const slot of pricedSlots) {
    const key = `${slot.optionId}:${slot.priceDelta}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity += 1;
      continue;
    }
    const option = optionById.get(slot.optionId);
    aggregated.set(key, {
      groupId: group.id,
      groupName: group.name,
      optionId: slot.optionId,
      optionName: option?.name ?? slot.optionId,
      quantity: 1,
      priceDelta: slot.priceDelta,
    });
  }

  return [...aggregated.values()];
}

/**
 * Builds POST /kiosk/orders `selections.modifiers` from option quantities (UPDATE-8).
 */
export function computeModifierPriceDeltasFromQuantities(
  group: ProductModifierGroup,
  options: ModifierOptionQuantity[],
): KioskOrderModifierSelection[] {
  const slotIds = expandOptionQuantitiesToSlotIds(options);
  if (slotIds.length === 0) {
    return [];
  }
  return aggregatePricedSlots(group, priceSlotsForGroup(group, slotIds));
}

/**
 * @deprecated Prefer computeModifierPriceDeltasFromQuantities.
 * Expands each option id to one slot (quantity 1).
 */
export function computeModifierPriceDeltas(
  group: ProductModifierGroup,
  selectedOptionIds: string[],
): KioskOrderModifierSelection[] {
  const options = selectedOptionIds.map((optionId) => ({ optionId, quantity: 1 }));
  return computeModifierPriceDeltasFromQuantities(group, options);
}

export function sumModifierPriceDeltas(
  modifiers: KioskOrderModifierSelection[],
): number {
  return roundMoney(
    modifiers.reduce((sum, row) => sum + row.priceDelta * row.quantity, 0),
  );
}
