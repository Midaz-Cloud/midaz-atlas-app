import { useEffect, useRef, useState } from 'react';

import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';
import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';
import { applyServerPricesToLines } from '@shared/kiosk-order/applyServerPricesToLines';
import {
  resolvePosChargeAmountVes,
  toEcrTerminalAmount,
  useEcrConnection,
} from '@shared/peripherals/ecr';
import {
  buildFailedPaymentInput,
  buildSuccessfulPosTransactionInput,
  recordFailedPaymentSafe,
  recordSuccessfulPosTransactionSafe,
  type FailedPaymentKioskContext,
} from '@shared/persistence';
import { useKioskSession } from '@shared/session';

import { reserveCartBeforePayment } from '../../services/reserveCartBeforePayment';
import { resolvePaymentPayerDocumentId } from '../../utils/resolvePaymentPayerDocumentId';
import { executePosCardPayment } from '../services/executePosCardPayment';
import type { PosChargePhase, PosChargeResult } from '../types';

export type UsePosChargeProcessingParams = {
  enabled: boolean;
  onComplete: (result: PosChargeResult) => void;
};

/**
 * Survives React Strict Mode / screen remounts so we never double-charge the POS
 * and never drop an approved terminal result when the wait screen remounts.
 * Cleared once the result is delivered so a payment-error retry starts a new charge.
 */
type ChargeSession = {
  promise: Promise<PosChargeResult>;
  delivered: boolean;
};

let chargeSession: ChargeSession | null = null;

/** Test helper — clears the module-level in-flight charge. */
export function resetPosChargeSessionForTests(): void {
  chargeSession = null;
}

type ChargeDeps = {
  paymentPayerDocumentId: string | null | undefined;
  customer: ReturnType<typeof useKioskCustomer>['customer'];
  lines: ReturnType<typeof useKioskOrder>['lines'];
  totals: ReturnType<typeof useKioskOrder>['totals'];
  applyServerUnitPrices: ReturnType<typeof useKioskOrder>['applyServerUnitPrices'];
  computeTotalsFor: ReturnType<typeof useKioskOrder>['computeTotalsFor'];
  reservationId: ReturnType<typeof useKioskOrder>['reservationId'];
  cardPaymentPayload: ReturnType<typeof useKioskOrder>['cardPaymentPayload'];
  cardKind: ReturnType<typeof useKioskOrder>['cardKind'];
  mobilePaymentPayload: ReturnType<typeof useKioskOrder>['mobilePaymentPayload'];
  orderType: ReturnType<typeof useKioskSession>['orderType'];
  tableNumber: ReturnType<typeof useKioskSession>['tableNumber'];
  ecr: ReturnType<typeof useEcrConnection>;
  setReservationId: ReturnType<typeof useKioskOrder>['setReservationId'];
  setCardPaymentPayload: ReturnType<typeof useKioskOrder>['setCardPaymentPayload'];
  setPhase: (phase: PosChargePhase) => void;
  isPhaseAlive: () => boolean;
};

async function runPosCharge(deps: ChargeDeps): Promise<PosChargeResult> {
  const {
    paymentPayerDocumentId,
    customer,
    lines,
    totals,
    applyServerUnitPrices,
    computeTotalsFor,
    reservationId,
    cardPaymentPayload,
    cardKind,
    mobilePaymentPayload,
    orderType,
    tableNumber,
    ecr,
    setReservationId,
    setCardPaymentPayload,
    setPhase,
    isPhaseAlive,
  } = deps;

  const payerDocumentId = resolvePaymentPayerDocumentId(
    paymentPayerDocumentId,
    customer?.documentId,
  );

  const failedCtx = (
    reservationOverride?: string | null,
  ): FailedPaymentKioskContext => ({
    customer,
    lines,
    totals,
    reservationId: reservationOverride ?? reservationId,
    paymentMethod: 'pos',
    cardPayment: cardPaymentPayload,
    mobilePayment: mobilePaymentPayload,
    orderType,
    tableNumber: tableNumber ?? null,
  });

  if (!payerDocumentId) {
    recordFailedPaymentSafe(
      buildFailedPaymentInput(failedCtx(), {
        stage: 'pos_charge',
        errorReason: 'missing_document',
        errorMessage: 'Documento del pagador no disponible',
      }),
    );
    return { ok: false, kind: 'payment-error' };
  }

  try {
    const reserveResult = await reserveCartBeforePayment(lines);
    if (!reserveResult.ok) {
      return {
        ok: false,
        kind: 'stock-shortage',
        shortages: reserveResult.shortages,
      };
    }
    setReservationId(reserveResult.reservationId);

    // Price lock: el backend va a facturar con los precios que congeló al reservar,
    // así que el POS tiene que cobrar ESE total. `totals` viene del render anterior
    // y `applyServerUnitPrices` no se propaga a tiempo — se recalcula en el momento.
    const lockedLines = applyServerPricesToLines(lines, reserveResult.serverPrices);
    const lockedTotals = computeTotalsFor(lockedLines);
    applyServerUnitPrices(reserveResult.serverPrices);

    const result = await executePosCardPayment({
      ecr,
      documentId: payerDocumentId,
      cartTotalVes: lockedTotals.totalVes,
    });
    if (!result.ok) {
      recordFailedPaymentSafe(
        buildFailedPaymentInput(failedCtx(reserveResult.reservationId), {
          stage: 'pos_charge',
          errorReason: result.reason,
          errorMessage: result.message,
          rawJson: result.rawResponse ?? null,
        }),
      );
      return { ok: false, kind: 'payment-error' };
    }

    if (isPhaseAlive()) {
      setPhase('confirming');
    }

    if (!customer) {
      recordFailedPaymentSafe(
        buildFailedPaymentInput(failedCtx(reserveResult.reservationId), {
          stage: 'pos_charge',
          errorReason: 'missing_customer',
          errorMessage: 'Cliente no disponible',
          rawJson: result.rawResponse,
        }),
      );
      return { ok: false, kind: 'payment-error' };
    }

    const posPayment = buildPosPaymentFromEcr({
      rawEcrResponse: result.rawResponse,
      customer: {
        documentId: customer.documentId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      },
      payerDocumentId,
      // Lo que declaró el cliente en la pantalla anterior. Antes iba fijo en
      // 'pos', así que `cardType` salía siempre 'debito' y la factura declaraba
      // catalogo11 05 aunque el pago fuera con crédito.
      paymentMethodId: cardKind === 'credito' ? 'credito' : 'pos',
      amountSentCents: toEcrTerminalAmount(
        resolvePosChargeAmountVes(lockedTotals.totalVes),
      ),
    });
    if (!posPayment.ok) {
      recordFailedPaymentSafe(
        buildFailedPaymentInput(failedCtx(reserveResult.reservationId), {
          stage: 'pos_parse',
          errorReason: 'pos_parse_failed',
          errorMessage: posPayment.message,
          rawJson: result.rawResponse,
        }),
      );
      return { ok: false, kind: 'payment-error' };
    }

    recordSuccessfulPosTransactionSafe(
      buildSuccessfulPosTransactionInput({
        payload: posPayment.payload,
        rawJson: result.rawResponse,
      }),
    );
    setCardPaymentPayload(posPayment.payload);
    return { ok: true };
  } catch (err) {
    recordFailedPaymentSafe(
      buildFailedPaymentInput(failedCtx(), {
        stage: 'pos_charge',
        errorReason: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
        rawJson: ecr.lastTransactionResponse,
      }),
    );
    return { ok: false, kind: 'payment-error' };
  }
}

/**
 * Runs reserve + POS charge + parse exactly once per enabled session.
 * Phases: waiting_pos (reserve + terminal) → confirming (parse / persist).
 *
 * Validation (executePosCardPayment + buildPosPaymentFromEcr) is unchanged;
 * this hook only owns UI phase + lifecycle so remounts cannot drop an APPROVED charge.
 */
export function usePosChargeProcessing({
  enabled,
  onComplete,
}: UsePosChargeProcessingParams) {
  const {
    lines,
    totals,
    applyServerUnitPrices,
    computeTotalsFor,
    paymentPayerDocumentId,
    setReservationId,
    setCardPaymentPayload,
    reservationId,
    cardPaymentPayload,
    cardKind,
    mobilePaymentPayload,
  } = useKioskOrder();
  const { customer } = useKioskCustomer();
  const { orderType, tableNumber } = useKioskSession();
  const ecr = useEcrConnection();
  const [phase, setPhase] = useState<PosChargePhase>('waiting_pos');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const phaseAliveRef = useRef(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let subscribed = true;
    phaseAliveRef.current = true;
    setPhase('waiting_pos');

    // Retry after payment-error: previous session already delivered — must charge again.
    if (chargeSession?.delivered) {
      chargeSession = null;
    }

    if (!chargeSession) {
      chargeSession = {
        delivered: false,
        promise: runPosCharge({
          paymentPayerDocumentId,
          customer,
          lines,
          totals,
          applyServerUnitPrices,
          computeTotalsFor,
          reservationId,
          cardPaymentPayload,
          cardKind,
          mobilePaymentPayload,
          orderType,
          tableNumber,
          ecr,
          setReservationId,
          setCardPaymentPayload,
          setPhase,
          isPhaseAlive: () => phaseAliveRef.current,
        }),
      };
    }

    void chargeSession.promise.then(result => {
      if (!subscribed || !chargeSession || chargeSession.delivered) {
        return;
      }
      chargeSession.delivered = true;
      onCompleteRef.current(result);
    });

    return () => {
      subscribed = false;
      phaseAliveRef.current = false;
      // Leave mid-charge (Strict Mode remount): keep session so the remount joins it.
      // Leave after success/error: drop session so the next visit can charge again.
      if (chargeSession?.delivered) {
        chargeSession = null;
      }
    };
    // Intentionally only `enabled`: do not restart mid-charge on catalog churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [enabled]);

  return { phase };
}
