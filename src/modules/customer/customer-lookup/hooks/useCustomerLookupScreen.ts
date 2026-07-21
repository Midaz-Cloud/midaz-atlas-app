import { useTranslation } from 'react-i18next';

export function useCustomerLookupScreen() {
  const { t } = useTranslation('customer');

  return {
    title: t('lookup.title'),
    subtitle: t('lookup.subtitle'),
    documentLabel: t('lookup.documentLabel'),
    continueLabel: t('lookup.continue'),
    loadingLabel: t('lookup.loading'),
    errorNotFound: t('errors.notFound'),
    errorNetwork: t('errors.network'),
    validationByType: {
      V: t('validation.documentV'),
      E: t('validation.documentE'),
      J: t('validation.documentJ'),
    },
  };
}
