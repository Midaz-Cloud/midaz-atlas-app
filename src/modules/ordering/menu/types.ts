import type { ImageSourcePropType } from 'react-native';

import type { ProductModifierGroup } from './modifierTypes';

export type { ProductModifierGroup, ProductModifierOption } from './modifierTypes';

export type ProductBadge = 'new' | 'popular' | 'soldOut';

export type MenuCategory = {
  id: string;
  nameKey: string;
  /** When set (API catalog), shown instead of i18n nameKey. */
  displayName?: string;
  /**
   * Order from backend `category.sortOrder` (UPDATE-13 §4.1).
   * Lower = earlier. Uncategorized / missing → Number.MAX_SAFE_INTEGER.
   */
  sortOrder?: number;
  /** Bundled asset (mock) or remote `{ uri }` when API provides category image. */
  image?: ImageSourcePropType;
};

export type MenuProduct = {
  id: string;
  /** Backend numeric product id for POST /orders. */
  apiProductId?: number;
  categoryId: string;
  categoryDisplayName?: string;
  /** From API `category.sortOrder` — used when building category tabs. */
  categorySortOrder?: number;
  sectionKey: string;
  nameKey: string;
  displayName?: string;
  displayDescription?: string;
  descriptionKey?: string;
  sku?: string;
  /** EAN/UPC from API — used for retail barcode scan lookup. */
  barcode?: string | null;
  /** Remote category tab image when provided by API. */
  categoryImageUrl?: string;
  unitPriceVes?: number;
  taxRate?: number;
  isExempt?: boolean;
  /** Unit price in organization primary currency (from API `price`). */
  unitPrice: number;
  /** Bundled asset (mock) or remote `{ uri }` when API provides image. */
  image?: ImageSourcePropType;
  /** Optional hero image for P5 (falls back to `image`). */
  detailImage?: ImageSourcePropType;
  /** When true, primary CTA opens modifier flow (P6). */
  hasModifiers?: boolean;
  /** API modifier groups (live catalog). */
  modifierGroups?: ProductModifierGroup[];
  /** Mock-only wizard flow id. */
  modifierFlowId?: string;
  badge?: ProductBadge;
  featured?: boolean;
  highlighted?: boolean;
  soldOut?: boolean;
  /** Stock disponible para límites de carrito (UPDATE-12). */
  available?: number;
};
