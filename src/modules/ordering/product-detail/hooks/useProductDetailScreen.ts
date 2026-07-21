import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { productHasApiModifiers } from '../../menu/modifierTypes';
import { resolveMaxAddQuantity } from '../../menu/productAvailability';
import type { MenuProduct } from '../../menu/types';

const FALLBACK_MAX_QUANTITY = 99;

export function useProductDetailScreen(product: MenuProduct, cartQuantity = 0) {
  const { t } = useTranslation('ordering');
  const [quantity, setQuantity] = useState(1);

  const maxAddQuantity = useMemo(
    () => resolveMaxAddQuantity(product, cartQuantity),
    [product, cartQuantity],
  );

  const maxQuantity = maxAddQuantity ?? FALLBACK_MAX_QUANTITY;
  const canAddToCart = maxAddQuantity == null || maxAddQuantity > 0;

  useEffect(() => {
    setQuantity((current) => {
      const capped = Math.min(current, maxQuantity);
      return Math.max(1, capped);
    });
  }, [maxQuantity, product.id]);

  const name = product.displayName ?? t(product.nameKey);
  const description =
    product.displayDescription ??
    (product.descriptionKey ? t(product.descriptionKey) : '');
  const heroImage = product.detailImage ?? product.image;

  const hasModifiers =
    productHasApiModifiers(product) ||
    Boolean(product.hasModifiers && product.modifierFlowId);

  const primaryActionKey = hasModifiers ? 'productDetail.continue' : 'productDetail.add';
  const primaryLabel = t(primaryActionKey);

  const lineTotalUsd = useMemo(
    () => product.unitPrice * quantity,
    [product.unitPrice, quantity],
  );

  const decrement = useCallback(() => {
    setQuantity((current) => Math.max(1, current - 1));
  }, []);

  const increment = useCallback(() => {
    setQuantity((current) => Math.min(maxQuantity, current + 1));
  }, [maxQuantity]);

  return {
    name,
    description,
    heroImage,
    quantity,
    maxQuantity,
    canAddToCart,
    primaryLabel,
    lineTotalUsd,
    decrement,
    increment,
  };
}
