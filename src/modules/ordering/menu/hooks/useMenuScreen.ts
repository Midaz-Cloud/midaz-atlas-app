import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getCatalogCategories, getCatalogProducts } from '@shared/catalog/catalogStore';
import { syncMockCatalogFromMenuMocks } from '@shared/api/kiosk/mock/buildMockFixtures';
import { shouldUseMockApi } from '@shared/config/api';

import { mockMenuCategories, mockMenuProducts } from '../data/mockMenuCatalog';
import type { MenuProduct } from '../types';

export type UseMenuScreenOptions = {
  excludeProductId?: string;
  initialCategoryId?: string;
};

function ensureCatalogLoaded(): void {
  const products = getCatalogProducts();
  if (products.length === 0 && shouldUseMockApi()) {
    syncMockCatalogFromMenuMocks();
  }
}

export function useMenuScreen(options: UseMenuScreenOptions = {}) {
  const { excludeProductId, initialCategoryId } = options;
  const { t } = useTranslation('ordering');

  ensureCatalogLoaded();

  const useMockFallback = shouldUseMockApi();
  const catalogProducts = getCatalogProducts();
  const catalogCategories = getCatalogCategories();

  // Memoizados para que los memos de abajo no se invaliden en cada render por
  // un `[]` nuevo cuando el catálogo está vacío.
  const categories = useMemo(
    () =>
      catalogCategories.length > 0
        ? catalogCategories
        : useMockFallback
          ? mockMenuCategories
          : [],
    [catalogCategories, useMockFallback],
  );

  const allProducts = useMemo(
    () =>
      catalogProducts.length > 0
        ? catalogProducts
        : useMockFallback
          ? mockMenuProducts
          : [],
    [catalogProducts, useMockFallback],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialCategoryId ?? categories[0]?.id ?? '',
  );
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesSearchAndExclude = useMemo(() => {
    return (product: MenuProduct) => {
      if (excludeProductId && product.id === excludeProductId) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const name = (product.displayName ?? t(product.nameKey)).toLowerCase();
      const description = product.displayDescription
        ? product.displayDescription.toLowerCase()
        : product.descriptionKey
          ? t(product.descriptionKey).toLowerCase()
          : '';
      return (
        name.includes(normalizedQuery) || description.includes(normalizedQuery)
      );
    };
  }, [excludeProductId, normalizedQuery, t]);

  const hasFeaturedProducts = allProducts.some((product) => product.featured);

  const featuredProducts = useMemo(
    () =>
      hasFeaturedProducts
        ? allProducts.filter(
            (product) => product.featured && matchesSearchAndExclude(product),
          )
        : [],
    [allProducts, hasFeaturedProducts, matchesSearchAndExclude],
  );

  const gridProducts = useMemo(() => {
    return allProducts.filter((product) => {
      if (hasFeaturedProducts && product.featured) {
        return false;
      }
      const matchesCategory =
        !selectedCategoryId || product.categoryId === selectedCategoryId;
      return matchesCategory && matchesSearchAndExclude(product);
    });
  }, [allProducts, hasFeaturedProducts, matchesSearchAndExclude, selectedCategoryId]);

  // Fase 2: solo la categoría elegida se monta (`gridProducts`); ya no se
  // precalcula la grilla de todas las categorías.
  return {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    searchQuery,
    setSearchQuery,
    featuredProducts,
    showFeaturedSection: hasFeaturedProducts,
    gridProducts,
  };
}

export type { MenuProduct };
