import { useTranslation } from 'react-i18next';

import { useKioskOrder } from '@shared/kiosk-order';

/** Pantalla post-procesamiento: muestra número de pedido para pagar en caja. */
export function useCashPaymentScreen() {
  const { t } = useTranslation('payment');
  const { orderId, confirmedOrder } = useKioskOrder();

  const displayOrderId =
    orderId ?? confirmedOrder?.displayOrderNumber ?? null;

  const copy = {
    title: `${t('cash.titleLine1')}\n${t('cash.titleLine2')}`,
    subtitle: t('cash.subtitle'),
    orderLabel: t('cash.orderLabel'),
    backToHome: t('cash.backToHome'),
  };

  return {
    orderId: displayOrderId,
    copy,
  };
}
