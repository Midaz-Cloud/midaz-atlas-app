import { useTranslation } from 'react-i18next';

import { isJuridicoDocumentId } from '../../utils/customerDocument';

export function useCustomerRegisterScreen(documentId: string) {
  const { t } = useTranslation('customer');
  const isJuridico = isJuridicoDocumentId(documentId);

  return {
    isJuridico,
    title: t('register.title'),
    subtitle: t('register.subtitle'),
    firstNameLabel: t('register.firstName'),
    lastNameLabel: t('register.lastName'),
    businessNameLabel: t('register.businessName'),
    phoneSubscriberPlaceholder: t('register.phoneSubscriber'),
    submitLabel: t('register.submit'),
    errorRegisterFailed: t('errors.registerFailed'),
  };
}
