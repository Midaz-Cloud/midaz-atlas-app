import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isPagoMovilAccountConfigured,
  mapPagoMovilAccountToDisplay,
  generatePagoMovilQrCode,
} from '@shared/api/kiosk/pagoMovilAccount';
import { mockPagoMovilAccount } from '@shared/api/kiosk/mock/mockPagoMovilAccount';
import { shouldUseMockApi } from '@shared/config/api';
import { useKioskSession } from '@shared/session';

import { usePaymentFlowTotals } from '../../hooks/usePaymentFlowTotals';

export function useMobilePaymentAccountScreen() {
  const { t } = useTranslation('payment');
  const { runtimeConfig } = useKioskSession();
  const { totalLabel, continueLabel, totalVes } = usePaymentFlowTotals();

  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);

  const rawAccount = useMemo(() => {
    const account = runtimeConfig?.raw.pagoMovilAccount;
    if (isPagoMovilAccountConfigured(account)) {
      return account!;
    }
    if (shouldUseMockApi()) {
      return mockPagoMovilAccount;
    }
    return null;
  }, [runtimeConfig?.raw.pagoMovilAccount]);

  const display = useMemo(() => {
    if (rawAccount) {
      return mapPagoMovilAccountToDisplay(rawAccount);
    }
    return { bank: '', phone: '', documentId: '', holder: '' };
  }, [rawAccount]);

  const hasAccountDetails = Boolean(
    display.bank || display.phone || display.documentId,
  );

  useEffect(() => {
    if (!rawAccount || !hasAccountDetails) {
      return;
    }

    let active = true;
    const fetchQr = async () => {
      setLoadingQr(true);
      try {
        const qr = await generatePagoMovilQrCode(rawAccount, totalVes);
        if (active) {
          setQrCodeUri(qr);
        }
      } catch (err) {
        console.warn('[useMobilePaymentAccountScreen] Failed to generate QR code:', err);
      } finally {
        if (active) {
          setLoadingQr(false);
        }
      }
    };

    fetchQr();

    return () => {
      active = false;
    };
  }, [rawAccount, totalVes, hasAccountDetails]);

  return {
    title: t('mobile.account.title'),
    subtitle: t('mobile.account.subtitle'),
    bankLabel: t('mobile.account.bank'),
    phoneLabel: t('mobile.account.phone'),
    rifLabel: t('mobile.account.rif'),
    bank: display.bank,
    phone: display.phone,
    rif: display.documentId,
    totalLabel,
    continueLabel,
    totalVes,
    hasAccountDetails,
    qrCodeUri,
    loadingQr,
  };
}
