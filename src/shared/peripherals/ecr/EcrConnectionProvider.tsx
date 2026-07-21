import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { shouldUseMockApi } from '@shared/config';
import { useKioskSession } from '@shared/session';

import type { UseUsbECRReturn } from './useUsbECR';
import { useUsbECR } from './useUsbECR';

const EcrConnectionContext = createContext<UseUsbECRReturn | null>(null);

export type EcrConnectionProviderProps = {
  children: ReactNode;
};

/**
 * Pre-connects USB POS when débito is enabled (live API).
 * Runs after kiosk bootstrap is ready — including from Home before checkout.
 */
export function EcrConnectionProvider({ children }: EcrConnectionProviderProps) {
  const ecr = useUsbECR();
  const { status, runtimeConfig } = useKioskSession();

  const debitoEnabled =
    runtimeConfig?.enabledPaymentMethods?.includes('debito') ?? false;
  const shouldWarmup =
    status === 'ready' && !shouldUseMockApi() && debitoEnabled;

  useEffect(() => {
    if (!shouldWarmup) {
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        await ecr.initialize();
        if (cancelled) return;
        await ecr.connect();
      } catch {
        // State surfaced via ecr.error / isConnected
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warmup once per session when débito is on
  }, [shouldWarmup]);

  const value = ecr;

  return (
    <EcrConnectionContext.Provider value={value}>{children}</EcrConnectionContext.Provider>
  );
}

export function useEcrConnection(): UseUsbECRReturn {
  const ctx = useContext(EcrConnectionContext);
  if (ctx == null) {
    throw new Error('useEcrConnection must be used within EcrConnectionProvider');
  }
  return ctx;
}

/** Safe outside provider (e.g. tests) — returns null. */
export function useEcrConnectionOptional(): UseUsbECRReturn | null {
  return useContext(EcrConnectionContext);
}
