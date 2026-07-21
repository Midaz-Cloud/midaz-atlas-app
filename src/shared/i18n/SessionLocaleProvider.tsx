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

  const applyLanguagePolicy = useCallback(async (policy: KioskLanguagePolicy) => {
    setConfigDefaultLocale(policy.defaultLocale);
    setLanguageSwitcherEnabled(policy.languageSwitcherEnabled);
    setEnabledLocales(policy.enabledLocales);
    setLocaleState(policy.defaultLocale);
    await i18n.changeLanguage(policy.defaultLocale);
  }, []);

  const resetSession = useCallback(async () => {
    setLocaleState(configDefaultLocale);
    await i18n.changeLanguage(configDefaultLocale);
  }, [configDefaultLocale]);

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
