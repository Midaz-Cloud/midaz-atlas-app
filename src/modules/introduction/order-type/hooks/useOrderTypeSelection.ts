import { useCallback } from 'react';

import type { OrderType } from '../../types';

type UseOrderTypeSelectionOptions = {
  onContinue: (orderType: OrderType) => void;
};

export function useOrderTypeSelection({ onContinue }: UseOrderTypeSelectionOptions) {
  const selectOrderType = useCallback(
    (orderType: OrderType) => {
      onContinue(orderType);
    },
    [onContinue],
  );

  return { selectOrderType };
}
