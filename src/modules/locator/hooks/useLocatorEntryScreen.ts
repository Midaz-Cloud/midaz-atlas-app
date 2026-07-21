import { useTranslation } from 'react-i18next';

export function useLocatorEntryScreen() {
  const { t } = useTranslation('locator');

  return {
    title: t('entry.title'),
    subtitle: t('entry.subtitle'),
    fieldLabel: t('entry.fieldLabel'),
    validateLabel: t('entry.validate'),
  };
}
