/** Modifier groups from GET /kiosk/products (guide UPDATED-2). */
export type ProductModifierOption = {
  id: string;
  name: string;
  additionalPrice: number;
  sortOrder: number;
  /** Remote image path from API (`imgUrl`, `imageUrl`, or `image`). */
  imageUrl?: string | null;
};

export type ProductModifierGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  quotaFree: number;
  quotaFreeBySize: unknown | null;
  excessPrice: number;
  sortOrder: number;
  options: ProductModifierOption[];
};

export function sortedModifierGroups(
  groups: ProductModifierGroup[] | undefined,
): ProductModifierGroup[] {
  if (!groups?.length) {
    return [];
  }
  return [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function productHasApiModifiers(product: {
  modifierGroups?: ProductModifierGroup[];
  hasModifiers?: boolean;
  modifierFlowId?: string;
}): boolean {
  return (product.modifierGroups?.length ?? 0) > 0;
}
