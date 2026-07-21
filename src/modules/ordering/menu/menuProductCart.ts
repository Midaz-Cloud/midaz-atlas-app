import type { AddProductOptions } from '@shared/kiosk-order/KioskOrderProvider';

import type { MenuProduct } from './types';

export function menuProductAddOptions(product: MenuProduct): AddProductOptions {
  return {
    unitPriceVes: product.unitPriceVes,
    taxRate: product.taxRate,
    isExempt: product.isExempt,
    modifierGroups: product.modifierGroups,
  };
}
