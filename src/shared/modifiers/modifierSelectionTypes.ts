/** One modifier option with a count (slots) within a group. */
export type ModifierOptionQuantity = {
  optionId: string;
  quantity: number;
};

/** Selection for a single modifier group on one product unit. */
export type GroupSelection = {
  groupId: string;
  options: ModifierOptionQuantity[];
};

/** All groups configured for one product unit in the wizard. */
export type UnitModifierSelections = Record<string, GroupSelection>;

export function totalSlotsInGroup(selection: GroupSelection | undefined): number {
  if (!selection?.options.length) {
    return 0;
  }
  return selection.options.reduce((sum, row) => sum + row.quantity, 0);
}

export function totalSlotsInUnit(unit: UnitModifierSelections | undefined): number {
  if (!unit) {
    return 0;
  }
  return Object.values(unit).reduce((sum, group) => sum + totalSlotsInGroup(group), 0);
}

/** Stable key fragment for one group's option quantities. */
export function groupSelectionKey(selection: GroupSelection): string {
  const parts = [...selection.options]
    .filter((row) => row.quantity > 0)
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((row) => `${row.optionId}x${row.quantity}`);
  return `${selection.groupId}:${parts.join(',')}`;
}

export function unitSelectionsKey(unit: UnitModifierSelections): string {
  return Object.values(unit)
    .filter((group) => totalSlotsInGroup(group) > 0)
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map((group) => groupSelectionKey(group))
    .join('|');
}

export function optionQuantitiesFromIds(optionIds: string[]): ModifierOptionQuantity[] {
  const counts = new Map<string, number>();
  for (const optionId of optionIds) {
    counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([optionId, quantity]) => ({ optionId, quantity }));
}

export function expandOptionQuantitiesToSlotIds(
  options: ModifierOptionQuantity[],
): string[] {
  const slots: string[] = [];
  for (const row of options) {
    for (let index = 0; index < row.quantity; index += 1) {
      slots.push(row.optionId);
    }
  }
  return slots;
}

export function recordToOptionQuantities(
  quantities: Record<string, number>,
): ModifierOptionQuantity[] {
  return Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([optionId, quantity]) => ({ optionId, quantity }));
}

export function optionQuantitiesToRecord(
  options: ModifierOptionQuantity[],
): Record<string, number> {
  const record: Record<string, number> = {};
  for (const row of options) {
    if (row.quantity > 0) {
      record[row.optionId] = row.quantity;
    }
  }
  return record;
}
