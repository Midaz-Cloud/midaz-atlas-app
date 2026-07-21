import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { shouldUseMockApi, showKioskDevUi } from '@shared/config';
import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';
import {
  formatEcrTerminalAmountHint,
  isPosTestChargeActive,
  resolvePosChargeAmountVes,
  toEcrTerminalAmount,
  useEcrConnection,
} from '@shared/peripherals/ecr';

import { formatAssociatedDocumentDisplay } from '../../utils/formatAssociatedDocument';
import { resolvePaymentPayerDocumentId } from '../../utils/resolvePaymentPayerDocumentId';
import { usePaymentFlowTotals } from '../../hooks/usePaymentFlowTotals';

export type UsePosPaymentScreenOptions = {
  posPaymentBusy?: boolean;
};

export function usePosPaymentScreen(options: UsePosPaymentScreenOptions = {}) {
  const { posPaymentBusy = false } = options;
  const { t } = useTranslation('payment');
  const { totalLabel, continueLabel, totalVes } = usePaymentFlowTotals();
  const { customer } = useKioskCustomer();
  const { paymentPayerDocumentId } = useKioskOrder();
  const ecr = useEcrConnection();

  useEffect(() => {
    if (shouldUseMockApi() || !ecr.usesNativeUsb || ecr.isConnected || ecr.isConnecting) {
      return;
    }
    void ecr.connect().catch(() => {});
  }, [ecr.isConnected, ecr.isConnecting, ecr.usesNativeUsb, ecr.connect]);

  const isProcessing = ecr.isProcessing || posPaymentBusy;

  const payerDocumentId = useMemo(
    () =>
      resolvePaymentPayerDocumentId(
        paymentPayerDocumentId,
        customer?.documentId,
      ),
    [customer?.documentId, paymentPayerDocumentId],
  );

  const syncingLabel = useMemo(() => {
    if (shouldUseMockApi()) {
      return t('pos.mockMode');
    }
    if (posPaymentBusy || ecr.isProcessing) {
      return t('pos.processing');
    }
    if (ecr.error) {
      return ecr.error;
    }
    if (ecr.isConnecting) {
      return t('pos.connecting');
    }
    if (ecr.isConnected) {
      return t('pos.connected');
    }
    if (!ecr.usesNativeUsb) {
      return t('pos.nativeMissing');
    }
    return t('pos.syncing');
  }, [
    ecr.error,
    ecr.isConnected,
    ecr.isConnecting,
    ecr.isProcessing,
    ecr.usesNativeUsb,
    posPaymentBusy,
    t,
  ]);

  const testChargeBanner = useMemo(() => {
    if (!showKioskDevUi() || !isPosTestChargeActive()) {
      return null;
    }
    const chargeVes = resolvePosChargeAmountVes(totalVes);
    return t('pos.testChargeBanner', {
      chargeHint: formatEcrTerminalAmountHint(toEcrTerminalAmount(chargeVes)),
    });
  }, [t, totalVes]);

  const associatedDocumentLabel = useMemo(() => {
    if (!payerDocumentId) {
      return null;
    }
    return t('payer.associatedDocument', {
      document: formatAssociatedDocumentDisplay(payerDocumentId),
    });
  }, [payerDocumentId, t]);

  return {
    title: t('pos.title'),
    subtitle: t('pos.subtitle'),
    totalLabel,
    continueLabel,
    syncingLabel,
    totalVes,
    testChargeBanner,
    associatedDocumentLabel,
    changeDocumentLabel: t('payer.changeDocument'),
    posReady:
      !isProcessing &&
      Boolean(payerDocumentId) &&
      (shouldUseMockApi() || ecr.isConnected || !ecr.usesNativeUsb),
    isProcessing,
  };
}
