import type { MenuProduct } from '@modules/ordering/menu/types';
import { productHasApiModifiers } from '@modules/ordering/menu/modifierTypes';
import { shouldUseMockApi } from '@shared/config/api';

export function productRequiresCustomization(product: MenuProduct): boolean {
  if (productHasApiModifiers(product)) {
    return true;
  }
  return shouldUseMockApi() && Boolean(product.modifierFlowId);
}
