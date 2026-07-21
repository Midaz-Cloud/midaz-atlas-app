import { useCallback, useEffect, useRef, useState } from 'react';

import { useKioskCustomer } from '@shared/customer';
import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';
import { useKioskOrder } from '@shared/kiosk-order';
import { useKioskOrganization, useKioskSession } from '@shared/session';

import { shouldEmitFiscalInvoice } from '@shared/peripherals/fiscal';

import {
  processKioskOrder,
  type ProcessKioskOrderParams,
} from '../services/processKioskOrder';
import type { OrderProcessingPhase, ProcessKioskOrderResult } from '../types';

function initialProcessingPhase(declaresTaxes: boolean): OrderProcessingPhase {
  return shouldEmitFiscalInvoice(declaresTaxes) ? 'fiscal' : 'registering';
}

export type UseOrderProcessingParams = {
  enabled: boolean;
  onComplete: (result: ProcessKioskOrderResult) => void;
};

export function useOrderProcessing({ enabled, onComplete }: UseOrderProcessingParams) {
  const {
    lines,
    totals,
    paymentMethodId,
    fiscalConfig,
    primaryCurrency,
    mobilePaymentPayload,
    cardPaymentPayload,
    setConfirmedOrder,
    reservationId,
    clearReservationId,
  } = useKioskOrder();
  const { customer } = useKioskCustomer();
  const { orderType, tableNumber, runtimeConfig } = useKioskSession();
  const organization = useKioskOrganization();
  const declaresTaxes = parseDeclaresTaxes(
    organization?.declaresTaxes ?? runtimeConfig?.raw.organization.declaresTaxes,
  );
  const [phase, setPhase] = useState<OrderProcessingPhase>(() =>
    initialProcessingPhase(declaresTaxes),
  );
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const run = useCallback(async () => {
    setPhase(initialProcessingPhase(declaresTaxes));
    const params: ProcessKioskOrderParams = {
      lines,
      totals,
      usdToVesRate: fiscalConfig.usdToVesRate,
      primaryCurrency,
      paymentMethodId,
      orderType,
      tableNumber,
      organizationName:
        organization?.name ?? runtimeConfig?.raw.organization.name,
      organizationLegalName:
        organization?.legalName ?? runtimeConfig?.raw.organization.legalName,
      declaresTaxes,
      customerId: customer?.id,
      customerDocumentId: customer?.documentId,
      customerName: customer
        ? `${customer.firstName} ${customer.lastName}`.trim()
        : undefined,
      mobilePayment:
        paymentMethodId === 'mobile' ? mobilePaymentPayload : undefined,
      cardPayment: paymentMethodId === 'pos' ? cardPaymentPayload : undefined,
      // Tracking QR on ticket when shortCode exists (UPDATE-14). Cash never gets QR.
      // Config `printQrEnabled` still controls P15 success screen.
      printQrEnabled: paymentMethodId !== 'cash',
      reservationId,
      onReservationExpired: clearReservationId,
      onOrderRegistered: (displayOrderNumber, grandTotalVES, grandTotalCurrency, currencyCode) => {
        setConfirmedOrder({
          displayOrderNumber,
          grandTotalVES,
          grandTotalCurrency,
          currencyCode,
        });
      },
    };
    const result = await processKioskOrder(params, setPhase);
    onCompleteRef.current(result);
  }, [
    lines,
    totals,
    fiscalConfig.usdToVesRate,
    primaryCurrency,
    paymentMethodId,
    orderType,
    tableNumber,
    organization?.name,
    organization?.legalName,
    declaresTaxes,
    runtimeConfig?.raw.organization.name,
    runtimeConfig?.raw.organization.legalName,
    customer?.id,
    customer?.documentId,
    customer?.firstName,
    customer?.lastName,
    mobilePaymentPayload,
    cardPaymentPayload,
    reservationId,
    clearReservationId,
    setConfirmedOrder,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void run();
  }, [enabled, run]);

  return { phase };
}
