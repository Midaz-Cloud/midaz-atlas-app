import { useCallback } from 'react';

import type { AppLocale } from '@shared/i18n';
import { useSessionLocale } from '@shared/i18n';

type UseLanguageSelectionOptions = {
  onContinue: () => void;
};

export function useLanguageSelection({ onContinue }: UseLanguageSelectionOptions) {
  const { setLocale } = useSessionLocale();

  const selectLanguage = useCallback(
    async (locale: AppLocale) => {
      await setLocale(locale);
      onContinue();
    },
    [onContinue, setLocale],
  );

  return { selectLanguage };
}
