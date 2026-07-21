import type { OrderType } from '@modules/introduction/types';

import type { FulfillmentType } from '../types';

export function orderTypeToFulfillment(orderType: OrderType | undefined): FulfillmentType {
  if (orderType === 'takeOut') {
    return 'PICKUP';
  }
  return 'IN_STORE';
}

export function fulfillmentToOrderType(fulfillment: FulfillmentType): OrderType {
  if (fulfillment === 'PICKUP' || fulfillment === 'DELIVERY') {
    return 'takeOut';
  }
  return 'dineIn';
}
