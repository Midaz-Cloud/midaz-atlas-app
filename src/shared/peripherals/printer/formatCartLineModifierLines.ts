import {
  getModifierGroup,
  getModifierOptionById,
  getToppingById,
} from '@modules/ordering/modifiers/data/mockToppings';
import i18n from '@shared/i18n/i18n';
import type { CartLine } from '@shared/kiosk-order/types';

import { layoutModifierTicketLines } from './ticketLineLayout';

/** Short mock group label for thermal ticket when API groupName is absent. */
const GROUP_PRINT_LABEL_KEY: Record<string, string> = {
  'cup-large-toppings': 'modifiers.groups.cupLargeToppings.printLabel',
  'yogurt-toppings': 'modifiers.groups.yogurtToppings.printLabel',
  'yogurt-sirope': 'modifiers.groups.yogurtSirope.printLabel',
  'yogurt-type': 'modifiers.groups.yogurtType.printLabel',
};

/** Print order for legacy mock yogurt/cup flows. */
const GROUP_PRINT_ORDER: Record<string, number> = {
  'yogurt-type': 0,
  'yogurt-toppings': 10,
  'yogurt-sirope': 20,
  'cup-large-toppings': 10,
};

const LEGACY_EXTRAS_LABEL_KEY = 'modifiers.groups.extras.printLabel';

function translateOrdering(key: string): string {
  return i18n.t(key, { ns: 'ordering' });
}

function resolveGroupPrintLabel(groupId: string, groupName?: string): string {
  const fromApi = groupName?.trim();
  if (fromApi) {
    return fromApi;
  }

  const mockGroup = getModifierGroup(groupId);
  if (mockGroup?.displayTitle?.trim()) {
    return mockGroup.displayTitle.trim();
  }

  const labelKey = GROUP_PRINT_LABEL_KEY[groupId];
  if (labelKey) {
    return translateOrdering(labelKey);
  }

  if (mockGroup?.titleKey) {
    return translateOrdering(mockGroup.titleKey);
  }

  return groupId;
}

function compareSelectionsByPrintOrder(
  a: { groupId: string },
  b: { groupId: string },
): number {
  const orderA = GROUP_PRINT_ORDER[a.groupId] ?? 99;
  const orderB = GROUP_PRINT_ORDER[b.groupId] ?? 99;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return a.groupId.localeCompare(b.groupId);
}

function buildModifierDescription(optionName: string, groupLabel: string): string {
  return `+ ${optionName} [${groupLabel}]`;
}

function appendModifierRows(
  rows: string[],
  optionName: string,
  groupId: string,
  groupName: string | undefined,
  priceDelta: number,
): void {
  const groupLabel = resolveGroupPrintLabel(groupId, groupName);
  const description = buildModifierDescription(optionName, groupLabel);
  rows.push(...layoutModifierTicketLines(description, priceDelta));
}

/**
 * Ticket lines per modifier: "+ Oreo [complementos]" with price or "Gratis"/"Free" right-aligned.
 */
export function formatCartLineModifierLines(line: CartLine): string[] {
  const rows: string[] = [];

  if (line.appliedModifiers?.length) {
    const sorted = [...line.appliedModifiers].sort(compareSelectionsByPrintOrder);
    for (const row of sorted) {
      const baseName = row.optionName.trim() || row.optionId;
      const optionName =
        row.quantity > 1 ? `${baseName} ×${row.quantity}` : baseName;
      appendModifierRows(
        rows,
        optionName,
        row.groupId,
        row.groupName,
        row.priceDelta * row.quantity,
      );
    }
    return rows;
  }

  if (line.modifierSelections?.length) {
    const sorted = [...line.modifierSelections].sort(compareSelectionsByPrintOrder);

    for (const selection of sorted) {
      const groupLabel = resolveGroupPrintLabel(selection.groupId);
      for (const option of selection.options) {
        const optionMeta = getModifierOptionById(option.optionId);
        const baseName = optionMeta
          ? translateOrdering(optionMeta.nameKey)
          : option.optionId;
        const optionName = option.quantity > 1 ? `${baseName} ×${option.quantity}` : baseName;
        const description = buildModifierDescription(optionName, groupLabel);
        rows.push(...layoutModifierTicketLines(description, 0));
      }
    }

    return rows;
  }

  const legacyIds = line.modifierIds ?? [];
  if (legacyIds.length === 0) {
    return [];
  }

  const extrasLabel = translateOrdering(LEGACY_EXTRAS_LABEL_KEY);
  for (const id of legacyIds) {
    const topping = getToppingById(id);
    const optionName = topping ? translateOrdering(topping.nameKey) : id;
    const description = buildModifierDescription(optionName, extrasLabel);
    rows.push(...layoutModifierTicketLines(description, 0));
  }

  return rows;
}
