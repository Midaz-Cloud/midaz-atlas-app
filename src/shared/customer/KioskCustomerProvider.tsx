import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { KioskCustomer } from './types';

export type KioskCustomerContextValue = {
  customer: KioskCustomer | undefined;
  setCustomer: (customer: KioskCustomer) => void;
  clearCustomer: () => void;
};

export const KioskCustomerContext = createContext<KioskCustomerContextValue | null>(null);

type KioskCustomerProviderProps = {
  children: ReactNode;
};

export function KioskCustomerProvider({ children }: KioskCustomerProviderProps) {
  const [customer, setCustomerState] = useState<KioskCustomer | undefined>();

  const setCustomer = useCallback((next: KioskCustomer) => {
    setCustomerState(next);
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomerState(undefined);
  }, []);

  const value = useMemo(
    () => ({
      customer,
      setCustomer,
      clearCustomer,
    }),
    [customer, setCustomer, clearCustomer],
  );

  return (
    <KioskCustomerContext.Provider value={value}>{children}</KioskCustomerContext.Provider>
  );
}

export function useKioskCustomer(): KioskCustomerContextValue {
  const context = useContext(KioskCustomerContext);
  if (!context) {
    throw new Error('useKioskCustomer must be used within KioskCustomerProvider');
  }
  return context;
}
