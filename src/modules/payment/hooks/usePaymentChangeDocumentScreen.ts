import { useTranslation } from 'react-i18next';

export function usePaymentChangeDocumentScreen() {
  const { t } = useTranslation('payment');

  return {
    title: t('changeDocumentScreen.title'),
    subtitle: t('changeDocumentScreen.subtitle'),
    documentLabel: t('changeDocumentScreen.documentPlaceholder'),
    continueLabel: t('changeDocumentScreen.continue'),
  };
}
