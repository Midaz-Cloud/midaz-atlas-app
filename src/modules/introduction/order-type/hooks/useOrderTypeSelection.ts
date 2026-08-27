import { useCallback } from 'react';

import type { KioskOrderTypeChoice } from '@shared/api/kiosk';

type UseOrderTypeSelectionOptions = {
  onContinue: (choice: KioskOrderTypeChoice) => void;
};

export function useOrderTypeSelection({ onContinue }: UseOrderTypeSelectionOptions) {
  const selectOrderType = useCallback(
    (choice: KioskOrderTypeChoice) => {
      onContinue(choice);
    },
    [onContinue],
  );

  return { selectOrderType };
}
