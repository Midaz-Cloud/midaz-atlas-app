import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { kioskConfig } from '@shared/config/kiosk';
import { shouldUseMockApi } from '@shared/config/api';
import { useKioskOrder } from '@shared/kiosk-order';
import type { UnitModifierSelections } from '@shared/modifiers/modifierSelectionTypes';
import { useKioskScreenColors } from '@shared/theme';
import { menuProductAddOptions } from './menu/menuProductCart';
import { productHasApiModifiers } from './menu/modifierTypes';
import { CartScreen } from './cart/CartScreen';
import { findMenuProduct } from './menu/data/findMenuProduct';
import { isProductUnavailable } from './menu/productAvailability';
import { MenuScreen } from './menu/MenuScreen';
import type { MenuProduct } from './menu/types';
import {
  apiModifierGroupToUiGroup,
  apiModifierOptionsForGroup,
  getApiModifierGroup,
  getApiModifierGroupCount,
} from './modifiers/apiModifierUi';
import {
  finishUnitSelectionsFromWizard,
  getFlowGroupCount,
  getGroupForFlow,
  type GroupSelection,
} from './modifiers/data/mockModifierFlows';
import { ModifiersScreen } from './modifiers/ModifiersScreen';
import {
  resolveOrderingLayerVisibility,
  type OrderingLayerMode,
} from './orderingLayers';
import { ProductDetailScreen } from './product-detail/ProductDetailScreen';
import { getSimilarProductsCategoryId } from './stock/getSimilarProductsCategory';
import { OutOfStockScreen } from './stock/OutOfStockScreen';

type OrderingRoute =
  | { name: 'menu' }
  | { name: 'product-detail'; productId: string; product: MenuProduct }
  | {
      name: 'modifiers';
      productId: string;
      product: MenuProduct;
      quantity: number;
      unitIndex: number;
      groupIndex: number;
      selectionsByUnit: Record<number, UnitModifierSelections>;
      source: 'api' | 'mock';
    }
  | { name: 'cart' }
  | { name: 'out-of-stock'; productId: string };

type ModifiersSession = Extract<OrderingRoute, { name: 'modifiers' }>;

type SimilarProductsFilter = {
  excludeProductId: string;
  categoryId: string;
};

export type OrderingNavigatorProps = {
  onExit?: () => void;
  onProceedToPayment: () => void;
  initialCartCheckoutOpen?: boolean;
};

function productUsesMockModifierFlow(product: MenuProduct): boolean {
  return shouldUseMockApi() && Boolean(product.modifierFlowId);
}

function productOpensModifierWizard(product: MenuProduct): boolean {
  return productHasApiModifiers(product) || productUsesMockModifierFlow(product);
}

function getGroupCountForProduct(product: MenuProduct, source: 'api' | 'mock'): number {
  if (source === 'api') {
    return getApiModifierGroupCount(product);
  }
  return product.modifierFlowId ? getFlowGroupCount(product.modifierFlowId) : 0;
}

function isLastWizardStep(
  product: MenuProduct,
  source: 'api' | 'mock',
  unitIndex: number,
  quantity: number,
  groupIndex: number,
): boolean {
  const groupCount = getGroupCountForProduct(product, source);
  return unitIndex === quantity - 1 && groupIndex === groupCount - 1;
}

/** Exported for unit tests — resolve product from route snapshot or catalog. */
export function resolveOrderingRouteProduct(route: OrderingRoute): MenuProduct | undefined {
  if (route.name === 'product-detail' || route.name === 'modifiers') {
    return route.product ?? findMenuProduct(route.productId);
  }
  return undefined;
}

function Layer({
  mode,
  backgroundColor,
  testID,
  children,
}: {
  mode: OrderingLayerMode;
  backgroundColor?: string;
  testID?: string;
  children: ReactNode;
}) {
  if (mode === 'unmounted') {
    return null;
  }
  return (
    <View
      collapsable={false}
      pointerEvents={mode === 'active' ? 'auto' : 'none'}
      style={[
        mode === 'active' ? styles.layerActive : styles.layerParked,
        mode === 'active' && backgroundColor ? { backgroundColor } : null,
      ]}
      testID={testID}>
      {children}
    </View>
  );
}

export function OrderingNavigator({
  onExit,
  onProceedToPayment,
  initialCartCheckoutOpen = false,
}: OrderingNavigatorProps) {
  const colors = useKioskScreenColors();
  const [route, setRoute] = useState<OrderingRoute>({ name: 'menu' });
  const [detailProduct, setDetailProduct] = useState<MenuProduct | null>(null);
  const [modifiersSession, setModifiersSession] = useState<ModifiersSession | null>(
    null,
  );
  const [similarFilter, setSimilarFilter] = useState<SimilarProductsFilter | null>(null);

  const {
    lines,
    itemCount,
    totalUsd,
    addProduct,
    incrementLine,
    decrementLine,
    removeLine,
  } = useKioskOrder();

  useEffect(() => {
    if (initialCartCheckoutOpen && itemCount > 0) {
      setRoute({ name: 'cart' });
    }
  }, [initialCartCheckoutOpen, itemCount]);

  useEffect(() => {
    if (
      (route.name === 'product-detail' || route.name === 'modifiers') &&
      !resolveOrderingRouteProduct(route)
    ) {
      console.warn(
        '[OrderingNavigator] missing product for route, returning to menu',
        route.name,
        'productId' in route ? route.productId : undefined,
      );
      setDetailProduct(null);
      setModifiersSession(null);
      setRoute({ name: 'menu' });
    }
  }, [route]);

  const clearProductSessions = useCallback(() => {
    setDetailProduct(null);
    setModifiersSession(null);
  }, []);

  const goToMenu = useCallback(() => {
    clearProductSessions();
    setRoute({ name: 'menu' });
  }, [clearProductSessions]);

  const goToCart = useCallback(() => {
    if (itemCount > 0) {
      setRoute({ name: 'cart' });
    }
  }, [itemCount]);

  const openOutOfStock = useCallback((product: MenuProduct) => {
    if (!kioskConfig.stockAlertEnabled) {
      return;
    }
    clearProductSessions();
    setRoute({ name: 'out-of-stock', productId: product.id });
  }, [clearProductSessions]);

  const handleProductPress = useCallback(
    (product: MenuProduct) => {
      if (isProductUnavailable(product)) {
        openOutOfStock(product);
        return;
      }
      setModifiersSession(null);
      setDetailProduct(product);
      setRoute({ name: 'product-detail', productId: product.id, product });
    },
    [openOutOfStock],
  );

  const handleBackFromDetail = useCallback(() => {
    goToMenu();
  }, [goToMenu]);

  const handleBackFromModifiers = useCallback(() => {
    const session =
      route.name === 'modifiers' ? route : modifiersSession;
    if (!session) {
      return;
    }
    const product = session.product ?? findMenuProduct(session.productId);
    if (!product) {
      goToMenu();
      return;
    }

    const groupCount = getGroupCountForProduct(product, session.source);
    if (session.groupIndex > 0) {
      const next = { ...session, groupIndex: session.groupIndex - 1 };
      setModifiersSession(next);
      setRoute(next);
      return;
    }

    if (session.unitIndex > 0) {
      const next = {
        ...session,
        unitIndex: session.unitIndex - 1,
        groupIndex: Math.max(0, groupCount - 1),
      };
      setModifiersSession(next);
      setRoute(next);
      return;
    }

    setDetailProduct(product);
    setRoute({
      name: 'product-detail',
      productId: session.productId,
      product,
    });
  }, [route, modifiersSession, goToMenu]);

  const handleBackFromCart = useCallback(() => {
    goToMenu();
  }, [goToMenu]);

  const handleAddMore = useCallback(() => {
    goToMenu();
  }, [goToMenu]);

  const startModifierWizard = useCallback((product: MenuProduct, quantity: number) => {
    const session: ModifiersSession = {
      name: 'modifiers',
      productId: product.id,
      product,
      quantity,
      unitIndex: 0,
      groupIndex: 0,
      selectionsByUnit: {},
      source: productHasApiModifiers(product) ? 'api' : 'mock',
    };
    setDetailProduct(product);
    setModifiersSession(session);
    setRoute(session);
  }, []);

  const handleAddProduct = useCallback(
    (product: MenuProduct) => {
      if (isProductUnavailable(product)) {
        openOutOfStock(product);
        return;
      }
      if (productOpensModifierWizard(product)) {
        startModifierWizard(product, 1);
        return;
      }
      addProduct(
        product.id,
        product.unitPrice,
        1,
        undefined,
        menuProductAddOptions(product),
      );
    },
    [addProduct, openOutOfStock, startModifierWizard],
  );

  const handleProductDetailPrimary = useCallback(
    (product: MenuProduct, quantity: number) => {
      if (isProductUnavailable(product)) {
        openOutOfStock(product);
        return;
      }
      if (productOpensModifierWizard(product)) {
        startModifierWizard(product, quantity);
        return;
      }
      addProduct(
        product.id,
        product.unitPrice,
        quantity,
        undefined,
        menuProductAddOptions(product),
      );
      goToMenu();
    },
    [addProduct, openOutOfStock, startModifierWizard, goToMenu],
  );

  const finishModifiersWizard = useCallback(
    (
      product: MenuProduct,
      quantity: number,
      selectionsByUnit: Record<number, UnitModifierSelections>,
    ) => {
      const perUnit = finishUnitSelectionsFromWizard(selectionsByUnit, quantity);
      for (const modifierSelections of perUnit) {
        addProduct(
          product.id,
          product.unitPrice,
          1,
          modifierSelections.length > 0 ? modifierSelections : undefined,
          menuProductAddOptions(product),
        );
      }
      goToMenu();
    },
    [addProduct, goToMenu],
  );

  const advanceWizard = useCallback(
    (selection: GroupSelection) => {
      const session =
        route.name === 'modifiers' ? route : modifiersSession;
      if (!session) {
        return;
      }
      const product = session.product ?? findMenuProduct(session.productId);
      if (!product) {
        return;
      }

      const unitSelections: UnitModifierSelections = {
        ...(session.selectionsByUnit[session.unitIndex] ?? {}),
        [selection.groupId]: selection,
      };
      const selectionsByUnit = {
        ...session.selectionsByUnit,
        [session.unitIndex]: unitSelections,
      };

      const groupCount = getGroupCountForProduct(product, session.source);
      const hasMoreGroups = session.groupIndex < groupCount - 1;
      if (hasMoreGroups) {
        const next: ModifiersSession = {
          ...session,
          product,
          selectionsByUnit,
          groupIndex: session.groupIndex + 1,
        };
        setModifiersSession(next);
        setRoute(next);
        return;
      }

      const hasMoreUnits = session.unitIndex < session.quantity - 1;
      if (hasMoreUnits) {
        const next: ModifiersSession = {
          ...session,
          product,
          selectionsByUnit,
          unitIndex: session.unitIndex + 1,
          groupIndex: 0,
        };
        setModifiersSession(next);
        setRoute(next);
        return;
      }

      finishModifiersWizard(product, session.quantity, selectionsByUnit);
    },
    [route, modifiersSession, finishModifiersWizard],
  );

  const handleCheckoutPrimary = useCallback(() => {
    if (itemCount > 0) {
      onProceedToPayment();
    }
  }, [itemCount, onProceedToPayment]);

  const handleBackFromOutOfStock = useCallback(() => {
    goToMenu();
  }, [goToMenu]);

  const handleViewSimilar = useCallback(() => {
    if (route.name !== 'out-of-stock') {
      return;
    }
    const categoryId = getSimilarProductsCategoryId(route.productId);
    if (categoryId) {
      setSimilarFilter({
        excludeProductId: route.productId,
        categoryId,
      });
    }
    goToMenu();
  }, [route, goToMenu]);

  const layers = resolveOrderingLayerVisibility({
    routeName: route.name,
    detailProductId: detailProduct?.id ?? null,
    modifiersSessionProductId: modifiersSession?.productId ?? null,
  });

  const modifiersLive =
    route.name === 'modifiers' ? route : modifiersSession;
  const detailLive =
    route.name === 'product-detail'
      ? route.product
      : detailProduct;

  let modifiersNode: ReactNode = null;
  if (modifiersLive && layers.modifiers !== 'unmounted') {
    const product = modifiersLive.product;
    const unitSelections = modifiersLive.selectionsByUnit[modifiersLive.unitIndex] ?? {};
    const isLastStep = isLastWizardStep(
      product,
      modifiersLive.source,
      modifiersLive.unitIndex,
      modifiersLive.quantity,
      modifiersLive.groupIndex,
    );

    if (modifiersLive.source === 'api') {
      const apiGroup = getApiModifierGroup(product, modifiersLive.groupIndex);
      const groupCount = getApiModifierGroupCount(product);
      if (apiGroup && groupCount > 0) {
        modifiersNode = (
          <ModifiersScreen
            key={`modifiers-${modifiersLive.productId}`}
            product={product}
            group={apiModifierGroupToUiGroup(apiGroup)}
            modifierOptions={apiModifierOptionsForGroup(apiGroup)}
            groupIndex={modifiersLive.groupIndex}
            groupCount={groupCount}
            unitIndex={modifiersLive.unitIndex}
            productQuantity={modifiersLive.quantity}
            initialGroupSelection={unitSelections[apiGroup.id]}
            isLastStep={isLastStep}
            apiModifierGroup={apiGroup}
            unitSelections={unitSelections}
            onBack={handleBackFromModifiers}
            onPrimary={advanceWizard}
          />
        );
      }
    } else if (product.modifierFlowId) {
      const flowId = product.modifierFlowId;
      const group = getGroupForFlow(flowId, modifiersLive.groupIndex);
      const groupCount = getFlowGroupCount(flowId);
      if (group && groupCount > 0) {
        modifiersNode = (
          <ModifiersScreen
            key={`modifiers-${modifiersLive.productId}`}
            product={product}
            group={group}
            groupIndex={modifiersLive.groupIndex}
            groupCount={groupCount}
            unitIndex={modifiersLive.unitIndex}
            productQuantity={modifiersLive.quantity}
            initialGroupSelection={unitSelections[group.id]}
            isLastStep={isLastStep}
            unitSelections={unitSelections}
            onBack={handleBackFromModifiers}
            onPrimary={advanceWizard}
          />
        );
      }
    }
  }

  const cartQuantityForDetail = detailLive
    ? lines
        .filter((line) => line.productId === detailLive.id)
        .reduce((sum, line) => sum + line.quantity, 0)
    : 0;

  return (
    <View style={styles.root} testID="ordering-navigator">
      <Layer mode={layers.menu} testID="ordering-layer-menu">
        <MenuScreen
          itemCount={itemCount}
          totalUsd={totalUsd}
          onBack={onExit ?? (() => {})}
          onProductPress={handleProductPress}
          onAddProduct={handleAddProduct}
          onCartPress={goToCart}
          onCartNext={() => {}}
          excludeProductId={similarFilter?.excludeProductId}
          initialCategoryId={similarFilter?.categoryId}
        />
      </Layer>

      {detailLive && layers.detail !== 'unmounted' ? (
        <Layer
          mode={layers.detail}
          backgroundColor={colors.screenBackground}
          testID="ordering-layer-detail">
          <ProductDetailScreen
            product={detailLive}
            itemCount={itemCount}
            totalUsd={totalUsd}
            cartQuantityForProduct={cartQuantityForDetail}
            onBack={handleBackFromDetail}
            onCartPress={goToCart}
            onPrimaryAction={handleProductDetailPrimary}
          />
        </Layer>
      ) : null}

      {modifiersNode ? (
        <Layer
          mode={layers.modifiers}
          backgroundColor={colors.screenBackground}
          testID="ordering-layer-modifiers">
          {modifiersNode}
        </Layer>
      ) : null}

      <Layer
        mode={layers.cart}
        backgroundColor={colors.screenBackground}
        testID="ordering-layer-cart">
        <CartScreen
          lines={lines}
          itemCount={itemCount}
          totalUsd={totalUsd}
          onBack={handleBackFromCart}
          onAddMore={handleAddMore}
          onIncrementLine={incrementLine}
          onDecrementLine={decrementLine}
          onRemoveLine={removeLine}
          onPressNext={() => {}}
          initialCheckoutOpen={initialCartCheckoutOpen}
          onPressCheckoutPrimary={handleCheckoutPrimary}
        />
      </Layer>

      <Layer
        mode={layers.outOfStock}
        backgroundColor={colors.screenBackground}
        testID="ordering-layer-out-of-stock">
        <OutOfStockScreen
          onBack={handleBackFromOutOfStock}
          onViewSimilar={handleViewSimilar}
        />
      </Layer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  layerActive: {
    flex: 1,
  },
  layerParked: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
});
