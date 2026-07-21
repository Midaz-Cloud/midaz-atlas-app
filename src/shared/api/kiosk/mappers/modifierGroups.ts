import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';

import type {
  KioskModifierGroupLive,
  KioskModifierOptionLive,
} from '../liveApi.types';
import type { KioskProductModifierGroup } from '../types';

/** Normalizes API image fields on modifier options to a single relative/absolute path. */
export function modifierOptionImagePath(
  option: Pick<
    KioskModifierOptionLive,
    'imgUrl' | 'imageUrl' | 'image'
  >,
): string | null {
  const path = option.imgUrl ?? option.imageUrl ?? option.image ?? null;
  if (path == null || typeof path !== 'string') {
    return null;
  }
  const trimmed = path.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapOptionLive(option: KioskModifierOptionLive) {
  return {
    id: option.id,
    name: option.name,
    additionalPrice: Number(option.additionalPrice) || 0,
    sortOrder: option.sortOrder ?? 0,
    imageUrl: modifierOptionImagePath(option),
  };
}

export function mapLiveModifierGroups(
  groups: KioskModifierGroupLive[] | undefined,
): ProductModifierGroup[] {
  if (!groups?.length) {
    return [];
  }
  return [...groups]
    .map((group) => ({
      id: group.id,
      name: group.name,
      isRequired: group.isRequired,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      quotaFree: group.quotaFree ?? 0,
      quotaFreeBySize: group.quotaFreeBySize ?? null,
      excessPrice: Number(group.excessPrice) || 0,
      sortOrder: group.sortOrder ?? 0,
      options: [...(group.options ?? [])]
        .map(mapOptionLive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapModifierGroupsToKioskApi(
  groups: ProductModifierGroup[] | undefined,
): KioskProductModifierGroup[] | undefined {
  if (!groups?.length) {
    return undefined;
  }
  return groups;
}
