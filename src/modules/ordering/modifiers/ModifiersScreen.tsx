import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ProductModifierGroup } from '../menu/modifierTypes';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import type { UnitModifierSelections } from '@shared/modifiers/modifierSelectionTypes';
import { optionQuantitiesToRecord } from '@shared/modifiers/modifierSelectionTypes';

import type { MenuProduct } from '../menu/types';
import {
  ModifiersBottomBar,
  ModifiersHeader,
  ModifiersApiDebugPanel,
  ModifierUnitPagination,
  ModifiersScreenHeader,
  ToppingsGrid,
} from './components';
import { useModifierGroupScreen } from './hooks/useModifierGroupScreen';
import { getOptionsForGroup } from './data/mockToppings';
import type { ModifierGroup, ModifierOption } from './types';
import type { GroupSelection } from '../data/mockModifierFlows';

export type ModifiersScreenProps = {
  product: MenuProduct;
  group: ModifierGroup;
  initialGroupSelection?: GroupSelection;
  groupIndex: number;
  groupCount: number;
  unitIndex: number;
  productQuantity: number;
  isLastStep: boolean;
  onBack: () => void;
  onPrimary: (selection: GroupSelection) => void;
  /** Live API options (overrides mock lookup). */
  modifierOptions?: ModifierOption[];
  apiModifierGroup?: ProductModifierGroup;
  unitSelections?: UnitModifierSelections;
};

export function ModifiersScreen({
  product,
  group,
  initialGroupSelection,
  groupIndex,
  groupCount,
  unitIndex,
  productQuantity,
  isLastStep,
  onBack,
  onPrimary,
  modifierOptions,
  apiModifierGroup,
  unitSelections,
}: ModifiersScreenProps) {
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        scroll: {
          flex: 1,
        },
        scrollContent: {
          gap: kioskScreenLayout.modifiersGridGap,
        },
        bottomWrap: {
          backgroundColor: colors.screenBackground,
        },
      }),
    [colors],
  );
  const { t } = useTranslation('ordering');
  const productName = product.displayName ?? t(product.nameKey);
  const insets = useSafeAreaInsets();
  const options = modifierOptions ?? getOptionsForGroup(group.id);
  const initialQuantities = optionQuantitiesToRecord(
    initialGroupSelection?.options ?? [],
  );

  const {
    selectedOptions,
    canSelectMore,
    isValid,
    title,
    subtitle,
    orderSummaryLabel,
    lineTotalUsd,
    incrementOption,
    decrementOption,
    getQuantity,
    currentGroupSelection,
    slotsUsed,
  } = useModifierGroupScreen({
    product,
    group,
    options,
    initialQuantities,
    stepCurrent: groupIndex + 1,
    stepTotal: groupCount,
    unitIndex,
    productQuantity,
    apiModifierGroup,
    unitSelections,
  });

  const primaryLabel = isLastStep ? t('modifiers.addToCart') : t('modifiers.next');

  return (
    <View style={styles.root} testID="ordering-modifiers">
      <ModifiersScreenHeader
        paddingTop={insets.top + kioskScreenLayout.menuHeaderPaddingTop}
        onBack={onBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + kioskScreenLayout.modifiersScrollBottomInset,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <ModifierUnitPagination
          currentUnit={unitIndex + 1}
          totalUnits={productQuantity}
          productName={productName}
        />
        <ModifiersHeader title={title} subtitle={subtitle} />
        <ModifiersApiDebugPanel
          product={product}
          groupIndex={groupIndex}
          apiModifierGroup={apiModifierGroup}
          uiOptions={options}
        />
        <ToppingsGrid
          toppings={options}
          getQuantity={getQuantity}
          canSelectMore={canSelectMore}
          maxSelections={group.maxSelections}
          slotsUsed={slotsUsed}
          onIncrement={incrementOption}
          onDecrement={decrementOption}
        />
      </ScrollView>

      <View style={[styles.bottomWrap, { paddingBottom: insets.bottom }]}>
        <ModifiersBottomBar
          selectedToppings={selectedOptions.map((row) => ({
            ...row.option,
            quantity: row.quantity,
          }))}
          orderSummaryLabel={orderSummaryLabel}
          totalUsd={lineTotalUsd}
          canAdd={isValid}
          primaryLabel={primaryLabel}
          onRemoveTopping={decrementOption}
          onPrimary={() => onPrimary(currentGroupSelection)}
        />
      </View>
    </View>
  );
}
