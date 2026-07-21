import type { ProductModifierGroup } from '../menu/modifierTypes';
import { freeModifierSlots } from '@shared/pricing/computeModifierPriceDeltas';
import { resolveKioskImageUrl } from '@shared/api/kiosk/imageUrl';

import type { ModifierGroup, ModifierOption } from './types';

export function apiModifierGroupToUiGroup(group: ProductModifierGroup): ModifierGroup {
  const maxSelections = Math.max(1, group.maxSelection);
  const minSelections = group.isRequired
    ? Math.max(1, group.minSelection)
    : group.minSelection;

  return {
    id: group.id,
    titleKey: group.id,
    descriptionKey: group.id,
    selectionMode: maxSelections === 1 ? 'single' : 'multi',
    minSelections,
    maxSelections,
    freeIncluded: freeModifierSlots(group.quotaFree),
    optionIds: group.options.map((option) => option.id),
    displayTitle: group.name,
    displayDescription: buildGroupDescription(group, minSelections, maxSelections),
  };
}

function buildGroupDescription(
  group: ProductModifierGroup,
  min: number,
  max: number,
): string {
  if (group.isRequired && min > 0) {
    return `Elige entre ${min} y ${max}`;
  }
  if (max === 1) {
    return 'Elige una opción';
  }
  return `Elige hasta ${max}`;
}

export function apiModifierOptionsForGroup(group: ProductModifierGroup): ModifierOption[] {
  return group.options.map((option) => {
    const uri = resolveKioskImageUrl(option.imageUrl);
    return {
      id: option.id,
      nameKey: option.id,
      displayName: option.name,
      priceUsd: option.additionalPrice,
      image: uri ? { uri } : undefined,
    };
  });
}

export function getApiModifierGroup(
  product: { modifierGroups?: ProductModifierGroup[] },
  groupIndex: number,
): ProductModifierGroup | undefined {
  const groups = product.modifierGroups ?? [];
  return groups[groupIndex];
}

export function getApiModifierGroupCount(product: {
  modifierGroups?: ProductModifierGroup[];
}): number {
  return product.modifierGroups?.length ?? 0;
}

export function isLastApiModifierGroup(
  product: { modifierGroups?: ProductModifierGroup[] },
  groupIndex: number,
): boolean {
  const count = getApiModifierGroupCount(product);
  return count > 0 && groupIndex === count - 1;
}
