import { useContext } from 'react';

import { KioskOrderContext, type KioskOrderContextValue } from './KioskOrderProvider';

export function useKioskOrder(): KioskOrderContextValue {
  const context = useContext(KioskOrderContext);

  if (!context) {
    throw new Error('useKioskOrder must be used within KioskOrderProvider');
  }

  return context;
}
