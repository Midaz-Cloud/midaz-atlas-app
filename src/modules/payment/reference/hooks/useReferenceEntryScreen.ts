import { useTranslation } from 'react-i18next';

export function useReferenceEntryScreen() {
  const { t } = useTranslation('payment');

  return {
    title: t('reference.enter.title'),
    subtitle: t('reference.enter.subtitle'),
    fieldLabel: t('reference.enter.fieldLabel'),
    validateLabel: t('reference.enter.validate'),
  };
}
