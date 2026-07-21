import { groupSelectionKey } from '@shared/modifiers/modifierSelectionTypes';

import type { CartLine, ModifierSelection } from './types';

export function modifierSelectionsKey(selections?: ModifierSelection[]): string {
  if (!selections?.length) {
    return '';
  }
  return [...selections]
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map((selection) => groupSelectionKey(selection))
    .join('|');
}

export function legacyModifierIdsKey(ids?: string[]): string {
  if (!ids?.length) {
    return '';
  }
  return [...ids].sort().join(',');
}

export function cartLineModifierKey(line: CartLine): string {
  if (line.modifierSelections?.length) {
    return modifierSelectionsKey(line.modifierSelections);
  }
  return legacyModifierIdsKey(line.modifierIds);
}
