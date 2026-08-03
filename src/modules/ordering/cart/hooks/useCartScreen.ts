import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageSourcePropType } from 'react-native';

import { KIOSK_CART_MAX_UNITS } from '@shared/kiosk-order';

import { findMenuProduct } from '../../menu/data/findMenuProduct';
import {
  getModifierGroup,
  getModifierOptionById,
  getToppingById,
} from '../../modifiers/data/mockToppings';
import {
  cartLineDisplayUnitPrice,
  cartLineTotalPrimary,
  resolveCartLineModifierSurcharge,
} from '../cartLinePricing';
import type { CartLine } from '../../hooks/useKioskCart';

const cartImages = {
  megaSundae: require('@assets/images/ordering/cart/cart-item-mega-sundae.png'),
} as const;

export type CartLineViewModel = {
  lineId: string;
  name: string;
  modifiersLabel?: string;
  unitPrice: number;
  lineTotalUsd: number;
  unitPriceVes?: number;
  lineTotalVes?: number;
  quantity: number;
  image?: ImageSourcePropType;
  imageBackground: string;
  canIncrement: boolean;
};

function resolveProductImage(
  productId: string,
  productImage: ImageSourcePropType | undefined,
): ImageSourcePropType | undefined {
  if (productId === 'mega-sundae-mix') {
    return cartImages.megaSundae;
  }
  return productImage;
}

function formatOptionQuantityLabel(name: string, quantity: number): string {
  return quantity > 1 ? `${name} ×${quantity}` : name;
}

function formatModifiersLabel(
  line: CartLine,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | undefined {
  if (line.appliedModifiers?.length) {
    const byGroup = new Map<string, { groupName: string; names: string[] }>();
    for (const row of line.appliedModifiers) {
      const groupName = row.groupName?.trim() || row.groupId;
      const entry = byGroup.get(row.groupId) ?? { groupName, names: [] };
      const base = row.optionName.trim() || row.optionId;
      entry.names.push(formatOptionQuantityLabel(base, row.quantity));
      byGroup.set(row.groupId, entry);
    }
    const parts = [...byGroup.values()].map(
      (group) => `${group.groupName}: ${group.names.join(', ')}`,
    );
    if (parts.length === 0) {
      return undefined;
    }
    return t('cart.modifiersSummary', { summary: parts.join(' · ') });
  }

  if (line.modifierSelections?.length) {
    const parts = line.modifierSelections
      .map((selection) => {
        const group = getModifierGroup(selection.groupId);
        const groupLabel = group ? t(group.titleKey) : selection.groupId;
        const optionNames = selection.options
          .map((row) => {
            const option = getModifierOptionById(row.optionId);
            const base = option ? t(option.nameKey) : row.optionId;
            return formatOptionQuantityLabel(base, row.quantity);
          })
          .filter((name) => name.length > 0);
        if (optionNames.length === 0) {
          return null;
        }
        return `${groupLabel}: ${optionNames.join(', ')}`;
      })
      .filter((part): part is string => part !== null);

    if (parts.length === 0) {
      return undefined;
    }
    return t('cart.modifiersSummary', { summary: parts.join(' · ') });
  }

  const modifierNames =
    line.modifierIds
      ?.map((id) => {
        const topping = getToppingById(id);
        return topping ? t(topping.nameKey) : null;
      })
      .filter((name): name is string => name !== null) ?? [];

  if (modifierNames.length === 0) {
    return undefined;
  }

  return t('cart.modifiersList', { names: modifierNames.join(', ') });
}

export function useCartScreen(lines: CartLine[], itemCount = 0) {
  const { t } = useTranslation('ordering');

  const cartLines = useMemo((): CartLineViewModel[] => {
    const canIncrementSession = itemCount < KIOSK_CART_MAX_UNITS;
    return lines
      .map((line, index) => {
        const product = findMenuProduct(line.productId);
        if (!product) {
          return null;
        }

        const modifiersLabel = formatModifiersLabel(line, t);

        const imageBackground = index % 2 === 0 ? '#fff4dd' : '#fef3c7';
        const modifierSurcharge = resolveCartLineModifierSurcharge(
          line,
          product.modifierGroups,
        );
        const lineTotalUsd = cartLineTotalPrimary(line, modifierSurcharge);
        const displayUnitPrice = cartLineDisplayUnitPrice(line, modifierSurcharge);
        const lineTotalVes =
          line.unitPriceVes != null
            ? Math.round(line.unitPriceVes * line.quantity * 100) / 100
            : undefined;
        const maxQuantity = product.available;
        const canIncrementStock =
          maxQuantity == null ? true : line.quantity < maxQuantity;
        const canIncrement = canIncrementStock && canIncrementSession;

        return {
          lineId: line.lineId,
          name: product.displayName ?? t(product.nameKey),
          modifiersLabel,
          unitPrice: displayUnitPrice,
          lineTotalUsd,
          unitPriceVes: line.unitPriceVes,
          lineTotalVes,
          quantity: line.quantity,
          image: resolveProductImage(line.productId, product.detailImage ?? product.image),
          imageBackground,
          canIncrement,
        };
      })
      .filter((line): line is CartLineViewModel => line !== null);
  }, [lines, itemCount, t]);

  return { cartLines };
}
