import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';
import type { ModifierSelection } from '@shared/kiosk-order/types';
import {
  computeModifierPriceDeltasFromQuantities,
  sumModifierPriceDeltas,
} from '@shared/pricing/computeModifierPriceDeltas';
import type { KioskOrderModifierSelection } from '@shared/api/kiosk/types';

export function resolveAppliedModifiersFromSelections(
  modifierGroups: ProductModifierGroup[] | undefined,
  modifierSelections: ModifierSelection[] | undefined,
): { appliedModifiers: KioskOrderModifierSelection[]; surcharge: number } {
  if (!modifierGroups?.length || !modifierSelections?.length) {
    return { appliedModifiers: [], surcharge: 0 };
  }

  const groupById = new Map(modifierGroups.map((group) => [group.id, group]));
  const appliedModifiers: KioskOrderModifierSelection[] = [];

  for (const selection of modifierSelections) {
    const group = groupById.get(selection.groupId);
    if (!group || selection.options.length === 0) {
      continue;
    }
    appliedModifiers.push(
      ...computeModifierPriceDeltasFromQuantities(group, selection.options),
    );
  }

  return {
    appliedModifiers,
    surcharge: sumModifierPriceDeltas(appliedModifiers),
  };
}
