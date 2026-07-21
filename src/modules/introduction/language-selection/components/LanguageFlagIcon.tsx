import type { AppLocale } from '@shared/i18n/types';

import FlagEn from '@assets/images/introduction/flag-en.svg';
import FlagEs from '@assets/images/introduction/flag-es.svg';
import { languageSelectionLayout } from '../theme';

type LanguageFlagIconProps = {
  locale: AppLocale;
};

export function LanguageFlagIcon({ locale }: LanguageFlagIconProps) {
  const Flag = locale === 'es' ? FlagEs : FlagEn;

  return (
    <Flag
      width={languageSelectionLayout.flagWidth}
      height={languageSelectionLayout.flagHeight}
    />
  );
}
