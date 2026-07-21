import { useTranslation } from 'react-i18next';

import { useKioskOrder } from '@shared/kiosk-order';

/** Totales y etiquetas comunes P10 (POS, pago móvil, Zelle). */
export function usePaymentFlowTotals() {
  const { t } = useTranslation('payment');
  const { totals, confirmedOrder } = useKioskOrder();

  const totalVes = confirmedOrder?.grandTotalVES ?? totals.totalVes;
  const totalUsd = confirmedOrder?.grandTotalCurrency ?? totals.totalUsd;

  return {
    totalLabel: t('flow.totalLabel'),
    continueLabel: t('flow.continue'),
    paidEnterReferenceLabel: t('flow.paidEnterReference'),
    totalVes,
    totalUsd,
  };
}
