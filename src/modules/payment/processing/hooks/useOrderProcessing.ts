import { useEffect, useRef, useState } from 'react';

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
import type { PaymentMethodId } from '../../types';

function initialProcessingPhase(declaresTaxes: boolean): OrderProcessingPhase {
  return shouldEmitFiscalInvoice(declaresTaxes) ? 'fiscal' : 'registering';
}

export type UseOrderProcessingParams = {
  enabled: boolean;
  onComplete: (result: ProcessKioskOrderResult) => void;
};

/**
 * Runs processKioskOrder exactly once per `enabled` session.
 * Does NOT re-run when `totals` / catalog identity churns (that previously
 * started a second createOrder → reservation_expired → back to cart after print).
 */
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

  const paramsRef = useRef<ProcessKioskOrderParams | null>(null);
  paramsRef.current = {
    lines,
    totals,
    usdToVesRate: fiscalConfig.usdToVesRate,
    primaryCurrency,
    paymentMethodId: paymentMethodId as PaymentMethodId | undefined,
    orderType,
    tableNumber,
    organizationName: organization?.name ?? runtimeConfig?.raw.organization.name,
    organizationLegalName:
      organization?.legalName ?? runtimeConfig?.raw.organization.legalName,
    declaresTaxes,
    customerId: customer?.id,
    customerDocumentId: customer?.documentId,
    customerName: customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : undefined,
    mobilePayment: paymentMethodId === 'mobile' ? mobilePaymentPayload : undefined,
    cardPayment: paymentMethodId === 'pos' ? cardPaymentPayload : undefined,
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

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setPhase(initialProcessingPhase(declaresTaxes));

    void (async () => {
      const params = paramsRef.current;
      if (!params) {
        return;
      }
      const result = await processKioskOrder(params, (nextPhase) => {
        if (!cancelled) {
          setPhase(nextPhase);
        }
      });
      if (cancelled) {
        return;
      }
      onCompleteRef.current(result);
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only `enabled`: catalog/config sync must not restart payment processing.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [enabled]);

  return { phase };
}
