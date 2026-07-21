export type OrderingLayerId =
  | 'menu'
  | 'detail'
  | 'modifiers'
  | 'cart'
  | 'outOfStock';

export type OrderingLayerMode = 'active' | 'parked' | 'unmounted';

export type OrderingRouteName =
  | 'menu'
  | 'product-detail'
  | 'modifiers'
  | 'cart'
  | 'out-of-stock';

export type ResolveOrderingLayersInput = {
  routeName: OrderingRouteName;
  /** Product id for open/parked product detail (null = no detail layer). */
  detailProductId: string | null;
  /** Product id for modifiers wizard session (null = no modifiers layer). */
  modifiersSessionProductId: string | null;
};

/**
 * Menu is never unmounted during ordering.
 * Detail stays parked while modifiers/cart for the same browsing session.
 * Modifiers stay parked when navigating to detail/cart until wizard ends on menu.
 */
export function resolveOrderingLayerVisibility(
  input: ResolveOrderingLayersInput,
): Record<OrderingLayerId, OrderingLayerMode> {
  const { routeName, detailProductId, modifiersSessionProductId } = input;

  const menu: OrderingLayerMode = routeName === 'menu' ? 'active' : 'parked';

  let detail: OrderingLayerMode = 'unmounted';
  if (detailProductId) {
    if (routeName === 'product-detail') {
      detail = 'active';
    } else if (routeName === 'modifiers' || routeName === 'cart') {
      detail = 'parked';
    }
  }

  let modifiers: OrderingLayerMode = 'unmounted';
  if (modifiersSessionProductId) {
    if (routeName === 'modifiers') {
      modifiers = 'active';
    } else if (routeName === 'product-detail' || routeName === 'cart') {
      modifiers = 'parked';
    }
  }

  return {
    menu,
    detail,
    modifiers,
    cart: routeName === 'cart' ? 'active' : 'unmounted',
    outOfStock: routeName === 'out-of-stock' ? 'active' : 'unmounted',
  };
}
