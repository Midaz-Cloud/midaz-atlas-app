import type { KioskAppearanceTranslation } from '../types';
import type { AppLocale } from '@shared/i18n/types';

export type KioskAppearanceCopySource = {
  title: string;
  subtitle: string;
  translations?: Record<string, KioskAppearanceTranslation> | null;
};

export type KioskAppearanceCopy = {
  title: string;
  subtitle: string;
};

export function resolveKioskAppearanceCopy(
  appearance: KioskAppearanceCopySource,
  locale: AppLocale,
): KioskAppearanceCopy {
  const localized = appearance.translations?.[locale];
  const title = localized?.title?.trim() || appearance.title.trim();
  const subtitle = localized?.subtitle?.trim() || appearance.subtitle.trim();
  return { title, subtitle };
}
