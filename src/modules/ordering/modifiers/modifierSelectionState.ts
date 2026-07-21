import type { ModifierGroup } from './types';

export type OptionQuantities = Record<string, number>;

export function totalSlotsUsed(quantities: OptionQuantities): number {
  return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
}

export function isModifierGroupValid(
  quantities: OptionQuantities,
  group: Pick<ModifierGroup, 'minSelections' | 'maxSelections'>,
): boolean {
  const used = totalSlotsUsed(quantities);
  return used >= group.minSelections && used <= group.maxSelections;
}

export function canIncrementOption(
  quantities: OptionQuantities,
  group: Pick<ModifierGroup, 'maxSelections'>,
): boolean {
  return totalSlotsUsed(quantities) < group.maxSelections;
}

export function incrementOptionQty(
  quantities: OptionQuantities,
  optionId: string,
  group: Pick<ModifierGroup, 'maxSelections'>,
): OptionQuantities {
  if (!canIncrementOption(quantities, group)) {
    return quantities;
  }
  return {
    ...quantities,
    [optionId]: (quantities[optionId] ?? 0) + 1,
  };
}

export function decrementOptionQty(
  quantities: OptionQuantities,
  optionId: string,
): OptionQuantities {
  const current = quantities[optionId] ?? 0;
  if (current <= 1) {
    const next = { ...quantities };
    delete next[optionId];
    return next;
  }
  return {
    ...quantities,
    [optionId]: current - 1,
  };
}

export function getOptionQuantity(quantities: OptionQuantities, optionId: string): number {
  return quantities[optionId] ?? 0;
}

/** @deprecated Legacy toggle API — use increment/decrement qty helpers. */
export function applyOptionToggle(
  current: string[],
  optionId: string,
  group: Pick<ModifierGroup, 'selectionMode' | 'maxSelections' | 'minSelections'>,
): string[] {
  const isSingle = group.selectionMode === 'single';

  if (current.includes(optionId)) {
    if (isSingle && group.minSelections > 0) {
      return current;
    }
    return current.filter((id) => id !== optionId);
  }

  if (isSingle) {
    return [optionId];
  }

  if (current.length >= group.maxSelections) {
    return current;
  }

  return [...current, optionId];
}

/** @deprecated */
export function canSelectMoreOptions(
  selectedIds: string[],
  group: Pick<ModifierGroup, 'selectionMode' | 'maxSelections'>,
): boolean {
  if (group.selectionMode === 'single') {
    return true;
  }
  return selectedIds.length < group.maxSelections;
}
