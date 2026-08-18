import { useTranslation } from 'react-i18next';

import { isJuridicoDocumentId } from '../../utils/customerDocument';

export function useCustomerRegisterScreen(
  documentId: string,
  options?: { requireEmail?: boolean; isEmailUpdate?: boolean },
) {
  const { t } = useTranslation('customer');
  const isJuridico = isJuridicoDocumentId(documentId);
  const requireEmail = options?.requireEmail === true;
  const isEmailUpdate = options?.isEmailUpdate === true;

  return {
    isJuridico,
    requireEmail,
    title: isEmailUpdate ? t('register.titleAddEmail') : t('register.title'),
    subtitle: isEmailUpdate
      ? t('register.subtitleAddEmail')
      : requireEmail
        ? t('register.subtitleWithEmail')
        : t('register.subtitle'),
    firstNameLabel: t('register.firstName'),
    lastNameLabel: t('register.lastName'),
    businessNameLabel: t('register.businessName'),
    emailLabel: t('register.email'),
    phoneSubscriberPlaceholder: t('register.phoneSubscriber'),
    submitLabel: t('register.submit'),
    errorRegisterFailed: t('errors.registerFailed'),
    errorUpdateFailed: t('errors.updateFailed'),
  };
}
