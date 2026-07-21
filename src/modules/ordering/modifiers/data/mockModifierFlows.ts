import type { ModifierFlow, ModifierGroup } from '../types';
import type { GroupSelection, ModifierOptionQuantity, UnitModifierSelections } from '@shared/modifiers/modifierSelectionTypes';
import { getModifierGroup } from './mockToppings';

export type { GroupSelection, ModifierOptionQuantity, UnitModifierSelections };

export const mockModifierFlows: Record<string, ModifierFlow> = {
  'cup-large-flow': {
    id: 'cup-large-flow',
    groupIds: ['cup-large-toppings'],
  },
  'yogurt-flow': {
    id: 'yogurt-flow',
    groupIds: ['yogurt-toppings', 'yogurt-sirope', 'yogurt-type'],
  },
};

export function getModifierFlow(flowId: string): ModifierFlow | undefined {
  return mockModifierFlows[flowId];
}

export function getGroupForFlow(
  flowId: string,
  groupIndex: number,
): ModifierGroup | undefined {
  const flow = getModifierFlow(flowId);
  if (!flow || groupIndex < 0 || groupIndex >= flow.groupIds.length) {
    return undefined;
  }
  return getModifierGroup(flow.groupIds[groupIndex]);
}

export function getFlowGroupCount(flowId: string): number {
  return getModifierFlow(flowId)?.groupIds.length ?? 0;
}

export function isLastFlowGroup(flowId: string, groupIndex: number): boolean {
  const count = getFlowGroupCount(flowId);
  return count > 0 && groupIndex === count - 1;
}

export function groupSelectionFromQuantities(
  groupId: string,
  quantities: Record<string, number>,
): GroupSelection {
  const options: ModifierOptionQuantity[] = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([optionId, quantity]) => ({ optionId, quantity }));
  return { groupId, options };
}

export function unitSelectionsToModifierSelections(
  unit: UnitModifierSelections,
): import('@shared/kiosk-order/types').ModifierSelection[] {
  return Object.values(unit)
    .filter((group) => group.options.some((row) => row.quantity > 0))
    .map((group) => ({
      groupId: group.groupId,
      options: group.options
        .filter((row) => row.quantity > 0)
        .map((row) => ({ optionId: row.optionId, quantity: row.quantity })),
    }));
}

/** @deprecated Use unitSelectionsToModifierSelections */
export function selectionsToModifierSelections(
  selectionsByGroup: Record<string, Record<string, number>>,
): import('@shared/kiosk-order/types').ModifierSelection[] {
  return Object.entries(selectionsByGroup)
    .map(([groupId, quantities]) => groupSelectionFromQuantities(groupId, quantities))
    .filter((group) => group.options.length > 0)
    .map((group) => ({
      groupId: group.groupId,
      options: group.options,
    }));
}

export function finishUnitSelectionsFromWizard(
  selectionsByUnit: Record<number, UnitModifierSelections>,
  quantity: number,
): import('@shared/kiosk-order/types').ModifierSelection[][] {
  const result: import('@shared/kiosk-order/types').ModifierSelection[][] = [];
  for (let unitIndex = 0; unitIndex < quantity; unitIndex += 1) {
    result.push(unitSelectionsToModifierSelections(selectionsByUnit[unitIndex] ?? {}));
  }
  return result;
}
