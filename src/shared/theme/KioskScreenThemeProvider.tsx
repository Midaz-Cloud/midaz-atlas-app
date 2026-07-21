import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useKioskAppearance } from '@shared/session/kioskSessionHooks';

import { buildKioskScreenColors, type KioskScreenThemeColors } from './kioskScreenTheme';
import { kioskScreenColors } from './kioskScreen';

const KioskScreenThemeContext = createContext<KioskScreenThemeColors>(kioskScreenColors);

type KioskScreenThemeProviderProps = {
  children: ReactNode;
};

export function KioskScreenThemeProvider({ children }: KioskScreenThemeProviderProps) {
  const appearance = useKioskAppearance();
  const colors = useMemo(() => buildKioskScreenColors(appearance), [appearance]);

  return (
    <KioskScreenThemeContext.Provider value={colors}>
      {children}
    </KioskScreenThemeContext.Provider>
  );
}

export function useKioskScreenColors(): KioskScreenThemeColors {
  return useContext(KioskScreenThemeContext);
}
