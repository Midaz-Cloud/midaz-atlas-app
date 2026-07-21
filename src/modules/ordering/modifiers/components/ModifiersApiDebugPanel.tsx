import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getRawModifierGroupsByApiId } from '@shared/catalog/rawModifierGroupsDebugStore';
import { getApiProductId } from '@shared/catalog/catalogStore';
import { shouldUseMockApi } from '@shared/config';
import { KioskDevJsonPanel } from '@shared/components/KioskDevJsonPanel';
import { bodyTextStyle, brand } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import type { ProductModifierGroup } from '../../menu/modifierTypes';
import type { MenuProduct } from '../../menu/types';
import type { ModifierOption } from '../types';

export type ModifiersApiDebugPanelProps = {
  product: MenuProduct;
  groupIndex: number;
  apiModifierGroup?: ProductModifierGroup;
  uiOptions: ModifierOption[];
};

function optionImageSummary(options: ModifierOption[]): string {
  const withImage = options.filter((option) => option.image != null).length;
  return `${withImage}/${options.length} con imagen en UI`;
}

/** Dev overlay: raw API modifierGroups JSON + mapped UI snapshot. */
export function ModifiersApiDebugPanel({
  product,
  groupIndex,
  apiModifierGroup,
  uiOptions,
}: ModifiersApiDebugPanelProps) {
  const apiProductId = getApiProductId(product.id) ?? product.apiProductId;
  const rawModifierGroups =
    apiProductId != null ? getRawModifierGroupsByApiId(apiProductId) : undefined;

  const debugPayload = useMemo(
    () => ({
      productId: product.id,
      apiProductId: apiProductId ?? null,
      groupIndex,
      rawModifierGroupsFromApi: rawModifierGroups ?? null,
      mappedModifierGroups: product.modifierGroups ?? null,
      activeGroupMapped: apiModifierGroup ?? null,
      uiOptions: uiOptions.map((option) => ({
        id: option.id,
        displayName: option.displayName,
        priceUsd: option.priceUsd,
        hasImage: option.image != null,
        image: option.image,
      })),
    }),
    [
      apiProductId,
      apiModifierGroup,
      groupIndex,
      product.id,
      product.modifierGroups,
      rawModifierGroups,
      uiOptions,
    ],
  );

  useEffect(() => {
    console.log('[ModifiersDebug] modifier payload', debugPayload);
  }, [debugPayload]);

  const meta = [
    shouldUseMockApi() ? 'API: mock' : 'API: live',
    `product ${product.displayName ?? product.id}`,
    apiProductId != null ? `apiProductId ${apiProductId}` : 'apiProductId —',
    optionImageSummary(uiOptions),
  ].join(' · ');

  return (
    <View style={styles.wrap} testID="modifiers-api-debug">
      <KioskDevJsonPanel
        title="Modificadores (debug JSON)"
        meta={meta}
        data={debugPayload}
        testID="modifiers-api-debug-json"
      />
      {rawModifierGroups == null && !shouldUseMockApi() ? (
        <Text style={styles.hint}>
          Sin JSON crudo en caché — reinicia la app tras cargar productos.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    paddingHorizontal: kioskScale(72.857),
    gap: kioskScale(8),
  },
  hint: {
    ...bodyTextStyle(),
    color: brand.gold,
    fontSize: kioskScale(14),
    fontWeight: '600',
  },
});
