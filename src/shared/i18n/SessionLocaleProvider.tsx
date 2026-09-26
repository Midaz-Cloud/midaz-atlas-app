import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { kioskConfig } from '@shared/config/kiosk';

import i18n from './i18n';
import type { KioskLanguagePolicy } from './resolveKioskLanguagePolicy';
import type { AppLocale } from './types';

type SessionLocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => Promise<void>;
  resetSession: () => Promise<void>;
  applyLanguagePolicy: (policy: KioskLanguagePolicy) => Promise<void>;
  languageSwitcherEnabled: boolean;
  enabledLocales: readonly AppLocale[];
};

export const SessionLocaleContext =
  createContext<SessionLocaleContextValue | null>(null);

type SessionLocaleProviderProps = {
  children: ReactNode;
  initialLocale?: AppLocale;
};

export function SessionLocaleProvider({
  children,
  initialLocale = kioskConfig.defaultLocale,
}: SessionLocaleProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);
  const [configDefaultLocale, setConfigDefaultLocale] = useState<AppLocale>(initialLocale);
  const [languageSwitcherEnabled, setLanguageSwitcherEnabled] = useState(false);
  const [enabledLocales, setEnabledLocales] = useState<readonly AppLocale[]>(['es']);

  const setLocale = useCallback(async (nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    await i18n.changeLanguage(nextLocale);
  }, []);

  const applyLanguagePolicy = useCallback(
    async (policy: KioskLanguagePolicy) => {
      setLanguageSwitcherEnabled(policy.languageSwitcherEnabled);
      setEnabledLocales(policy.enabledLocales);
      // Solo tocar el idioma activo si el default de la config REALMENTE
      // cambió (el admin lo cambió en el panel). Si no, cada refresco de
      // catálogo/config (cada 60s o tras una venta) pisaba el idioma que el
      // cliente eligió a mitad de la compra.
      if (policy.defaultLocale === configDefaultLocale) {
        return;
      }
      setConfigDefaultLocale(policy.defaultLocale);
      setLocaleState(policy.defaultLocale);
      await i18n.changeLanguage(policy.defaultLocale);
    },
    [configDefaultLocale],
  );

  const resetSession = useCallback(async () => {
    if (locale === configDefaultLocale) {
      return;
    }
    setLocaleState(configDefaultLocale);
    await i18n.changeLanguage(configDefaultLocale);
  }, [locale, configDefaultLocale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      resetSession,
      applyLanguagePolicy,
      languageSwitcherEnabled,
      enabledLocales,
    }),
    [
      locale,
      setLocale,
      resetSession,
      applyLanguagePolicy,
      languageSwitcherEnabled,
      enabledLocales,
    ],
  );

  return (
    <SessionLocaleContext.Provider value={value}>
      {children}
    </SessionLocaleContext.Provider>
  );
}
