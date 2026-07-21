import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProductModifierGroup } from '../../menu/modifierTypes';
import type { MenuProduct } from '../../menu/types';
import {
  computeModifierPriceDeltasFromQuantities,
  sumModifierPriceDeltas,
} from '@shared/pricing/computeModifierPriceDeltas';
import {
  groupSelectionFromQuantities,
  type UnitModifierSelections,
} from '../data/mockModifierFlows';
import {
  canIncrementOption,
  decrementOptionQty,
  getOptionQuantity,
  incrementOptionQty,
  isModifierGroupValid,
  totalSlotsUsed,
  type OptionQuantities,
} from '../modifierSelectionState';
import type { ModifierGroup, ModifierOption } from '../types';

export type UseModifierGroupScreenParams = {
  product: MenuProduct;
  group: ModifierGroup;
  options: ModifierOption[];
  initialQuantities?: OptionQuantities;
  stepCurrent?: number;
  stepTotal?: number;
  unitIndex?: number;
  productQuantity?: number;
  apiModifierGroup?: ProductModifierGroup;
  unitSelections?: UnitModifierSelections;
};

function optionsFromUnitGroup(
  unitSelections: UnitModifierSelections,
  groupId: string,
): OptionQuantities {
  const saved = unitSelections[groupId];
  if (!saved?.options.length) {
    return {};
  }
  return saved.options.reduce<OptionQuantities>((acc, row) => {
    if (row.quantity > 0) {
      acc[row.optionId] = row.quantity;
    }
    return acc;
  }, {});
}

export function useModifierGroupScreen({
  product,
  group,
  options,
  initialQuantities = {},
  stepCurrent,
  stepTotal,
  unitIndex = 0,
  productQuantity = 1,
  apiModifierGroup,
  unitSelections = {},
}: UseModifierGroupScreenParams) {
  const { t } = useTranslation('ordering');
  const [quantities, setQuantities] = useState<OptionQuantities>(initialQuantities);

  // Stable ModifiersScreen key across wizard steps — reset local qty when group/unit changes.
  useEffect(() => {
    const fromUnit = optionsFromUnitGroup(unitSelections, group.id);
    const hasSaved = Object.keys(fromUnit).length > 0;
    setQuantities(hasSaved ? fromUnit : initialQuantities);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by group/unit only
  }, [group.id, unitIndex]);

  const slotsUsed = totalSlotsUsed(quantities);
  const isValid = isModifierGroupValid(quantities, group);
  const canSelectMore = canIncrementOption(quantities, group);

  const selectedOptions = useMemo(() => {
    return options
      .map((option) => ({
        option,
        quantity: getOptionQuantity(quantities, option.id),
      }))
      .filter((row) => row.quantity > 0);
  }, [options, quantities]);

  const incrementOption = useCallback(
    (optionId: string) => {
      setQuantities((current) => incrementOptionQty(current, optionId, group));
    },
    [group],
  );

  const decrementOption = useCallback((optionId: string) => {
    setQuantities((current) => decrementOptionQty(current, optionId));
  }, []);

  const getQuantity = useCallback(
    (optionId: string) => getOptionQuantity(quantities, optionId),
    [quantities],
  );

  const productLabel = product.displayName ?? t(product.nameKey);
  const title = group.displayTitle ?? t(group.titleKey);
  let subtitle =
    group.displayDescription ??
    t(group.descriptionKey, {
      max: group.maxSelections,
      min: group.minSelections,
    });

  if (stepCurrent !== undefined && stepTotal !== undefined && stepTotal > 1) {
    subtitle = `${t('modifiers.stepProgress', { current: stepCurrent, total: stepTotal })} · ${subtitle}`;
  }

  subtitle = `${subtitle} · ${t('modifiers.slotsUsed', {
    used: slotsUsed,
    max: group.maxSelections,
  })}`;

  const orderSummaryLabel = t('modifiers.orderSummaryUnit', {
    product: productLabel,
    unit: unitIndex + 1,
    totalUnits: productQuantity,
    slots: slotsUsed,
  });

  const lineTotalUsd = useMemo(() => {
    const base = product.unitPrice;
    if (!product.modifierGroups?.length) {
      return base;
    }

    let surcharge = 0;
    for (const modifierGroup of product.modifierGroups) {
      const groupQuantities =
        modifierGroup.id === apiModifierGroup?.id
          ? quantities
          : optionsFromUnitGroup(unitSelections, modifierGroup.id);
      const groupOptions = Object.entries(groupQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([optionId, quantity]) => ({ optionId, quantity }));

      if (groupOptions.length > 0) {
        surcharge += sumModifierPriceDeltas(
          computeModifierPriceDeltasFromQuantities(modifierGroup, groupOptions),
        );
      }
    }
    return base + surcharge;
  }, [
    product.unitPrice,
    product.modifierGroups,
    apiModifierGroup?.id,
    quantities,
    unitSelections,
  ]);

  const currentGroupSelection = useMemo(
    () => groupSelectionFromQuantities(group.id, quantities),
    [group.id, quantities],
  );

  return {
    options,
    quantities,
    selectedOptions,
    canSelectMore,
    isValid,
    slotsUsed,
    title,
    subtitle,
    orderSummaryLabel,
    lineTotalUsd,
    incrementOption,
    decrementOption,
    getQuantity,
    currentGroupSelection,
  };
}
