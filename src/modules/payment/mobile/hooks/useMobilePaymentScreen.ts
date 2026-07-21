import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';

import { formatAssociatedDocumentDisplay } from '../../utils/formatAssociatedDocument';
import { resolvePaymentPayerDocumentId } from '../../utils/resolvePaymentPayerDocumentId';

export function useMobilePaymentScreen() {
  const { t } = useTranslation('payment');
  const { customer } = useKioskCustomer();
  const { paymentPayerDocumentId } = useKioskOrder();

  const payerDocumentId = useMemo(
    () =>
      resolvePaymentPayerDocumentId(
        paymentPayerDocumentId,
        customer?.documentId,
      ),
    [customer?.documentId, paymentPayerDocumentId],
  );

  const associatedDocumentLabel = useMemo(() => {
    if (!payerDocumentId) {
      return null;
    }
    return t('payer.associatedDocument', {
      document: formatAssociatedDocumentDisplay(payerDocumentId),
    });
  }, [payerDocumentId, t]);

  return {
    title: t('mobile.confirm.title'),
    subtitle: t('mobile.confirm.subtitle'),
    associatedDocumentLabel,
    referencePlaceholder: t('mobile.confirm.referencePlaceholder'),
    phonePlaceholder: t('mobile.confirm.phonePlaceholder'),
    bankPlaceholder: t('mobile.confirm.bankPlaceholder'),
    continueLabel: t('mobile.confirm.continue'),
    changeDocumentLabel: t('payer.changeDocument'),
    bankSheetLoading: t('mobile.bankSheet.loading'),
  };
}
