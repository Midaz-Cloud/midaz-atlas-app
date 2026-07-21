import { kioskConfig } from '@shared/config/kiosk';

import type { AppLocale } from './types';

export type KioskLanguagePolicy = {
  enabledLocales: readonly AppLocale[];
  defaultLocale: AppLocale;
  languageSwitcherEnabled: boolean;
};

function isAppLocale(value: string): value is AppLocale {
  return value === 'es' || value === 'en';
}

/** Resolves kiosk language rules from config `appearance.languages`. */
export function resolveKioskLanguagePolicy(
  languages: string[] | null | undefined,
): KioskLanguagePolicy {
  const filtered = (languages ?? []).filter(isAppLocale);

  if (filtered.length === 0) {
    return {
      enabledLocales: ['es'],
      defaultLocale: 'es',
      languageSwitcherEnabled: false,
    };
  }

  if (filtered.length === 1) {
    return {
      enabledLocales: [filtered[0]],
      defaultLocale: filtered[0],
      languageSwitcherEnabled: false,
    };
  }

  const unique = [...new Set(filtered)] as AppLocale[];
  const rawCount = languages?.length ?? 0;

  return {
    enabledLocales: unique,
    defaultLocale: unique[0] ?? kioskConfig.defaultLocale,
    languageSwitcherEnabled: rawCount === 2 && unique.length === 2,
  };
}
