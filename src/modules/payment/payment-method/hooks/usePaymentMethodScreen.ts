import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useKioskOrder } from '@shared/kiosk-order';

import { getEnabledPaymentMethods } from '../../data/getEnabledPaymentMethods';
import type { PaymentMethodId } from '../../types';
import { useKioskSession } from '@shared/session';

export function usePaymentMethodScreen(onSelectMethod: (methodId: PaymentMethodId) => void) {
  const { t } = useTranslation('payment');
  const { paymentMethodId, setPaymentMethodId } = useKioskOrder();
  const { runtimeConfig } = useKioskSession();

  const methods = useMemo(
    () =>
      getEnabledPaymentMethods(runtimeConfig?.enabledPaymentMethods, {
        pagoMovilAccount: runtimeConfig?.raw.pagoMovilAccount,
      }),
    [runtimeConfig?.enabledPaymentMethods, runtimeConfig?.raw.pagoMovilAccount],
  );

  const methodLabels = useMemo(
    () =>
      ({
        pos: {
          title: t('methodSelect.pos.title'),
          description: t('methodSelect.pos.description'),
        },
        mobile: {
          title: t('methodSelect.mobile.title'),
          description: t('methodSelect.mobile.description'),
        },
        cash: {
          title: t('methodSelect.cash.title'),
          description: t('methodSelect.cash.description'),
        },
        zelle: {
          title: t('methodSelect.zelle.title'),
          description: t('methodSelect.zelle.description'),
        },
      }) satisfies Record<
        PaymentMethodId,
        { title: string; description: string }
      >,
    [t],
  );

  const handleSelect = useCallback(
    (methodId: PaymentMethodId) => {
      setPaymentMethodId(methodId);
      onSelectMethod(methodId);
    },
    [onSelectMethod, setPaymentMethodId],
  );

  return {
    methods,
    methodLabels,
    selectedMethodId: paymentMethodId as PaymentMethodId | undefined,
    handleSelect,
  };
}
