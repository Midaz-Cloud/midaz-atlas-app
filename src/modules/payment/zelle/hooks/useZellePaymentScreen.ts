import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { mockZellePaymentAccount } from '../../data/mockZellePaymentAccount';
import { usePaymentFlowTotals } from '../../hooks/usePaymentFlowTotals';
import type { PaymentAccountField } from '../../components/PaymentAccountDetailsPanel';

export function useZellePaymentScreen() {
  const { t } = useTranslation('payment');
  const { totalLabel, paidEnterReferenceLabel, totalVes } = usePaymentFlowTotals();

  const fields = useMemo(
    (): PaymentAccountField[] => [
      {
        label: t('zelle.holderName'),
        value: mockZellePaymentAccount.holderName,
        testID: 'payment-zelle-holder',
        fullWidth: true,
      },
      {
        label: t('zelle.email'),
        value: mockZellePaymentAccount.email,
        testID: 'payment-zelle-email',
        tallValue: true,
        fullWidth: true,
      },
      {
        label: t('zelle.phone'),
        value: mockZellePaymentAccount.phone,
        testID: 'payment-zelle-phone',
      },
    ],
    [t],
  );

  return {
    title: t('zelle.title'),
    subtitle: t('zelle.subtitle'),
    fields,
    totalLabel,
    continueLabel: paidEnterReferenceLabel,
    totalVes,
  };
}
