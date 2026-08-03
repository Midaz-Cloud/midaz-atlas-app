import { useCallback, useState } from 'react';

import {
  isValidateMobilePaymentSuccess,
  KioskApiError,
  validateMobilePaymentWithApi,
} from '@shared/api/kiosk';
import { useKioskCustomer } from '@shared/customer';
import { useKioskOrder } from '@shared/kiosk-order';
import type { MobilePaymentPayload } from '@shared/kiosk-order';
import {
  buildFailedPaymentInput,
  recordFailedPaymentSafe,
} from '@shared/persistence';
import { useKioskSession } from '@shared/session';

export type MobilePaymentValidationResult =
  | { ok: true; payload: MobilePaymentPayload }
  | { ok: false; message: string };

export function useMobilePaymentValidation() {
  const { customer } = useKioskCustomer();
  const {
    totals,
    setMobilePaymentPayload,
    lines,
    reservationId,
  } = useKioskOrder();
  const { orderType, tableNumber } = useKioskSession();
  const [validating, setValidating] = useState(false);

  const validate = useCallback(
    async (base: {
      bankCode: string;
      bankName: string;
      reference: string;
      cedula: string;
      phone: string;
    }): Promise<MobilePaymentValidationResult> => {
      setValidating(true);
      try {
        const response = await validateMobilePaymentWithApi({
          bankCode: base.bankCode,
          reference: base.reference,
          cedula: base.cedula,
          phone: base.phone,
          amountVes: totals.totalVes,
        });

        if (!isValidateMobilePaymentSuccess(response)) {
          const message = response.message || 'Pago móvil rechazado';
          recordFailedPaymentSafe(
            buildFailedPaymentInput(
              {
                customer,
                lines,
                totals,
                reservationId,
                paymentMethod: 'mobile',
                mobilePayment: base,
                orderType,
                tableNumber: tableNumber ?? null,
              },
              {
                stage: 'mobile_validate',
                errorReason: 'mobile_rejected',
                errorMessage: message,
                rawJson: safeStringify(response),
                mobileReference: base.reference,
              },
            ),
          );
          return {
            ok: false,
            message,
          };
        }

        const payload: MobilePaymentPayload = {
          ...base,
          disglobalRef: response.disglobalRef,
        };
        setMobilePaymentPayload(payload);
        return { ok: true, payload };
      } catch (error) {
        const message =
          error instanceof KioskApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Error al validar pago móvil';
        recordFailedPaymentSafe(
          buildFailedPaymentInput(
            {
              customer,
              lines,
              totals,
              reservationId,
              paymentMethod: 'mobile',
              mobilePayment: base,
              orderType,
              tableNumber: tableNumber ?? null,
            },
            {
              stage: 'mobile_validate',
              errorReason: 'mobile_validate_error',
              errorMessage: message,
              rawJson:
                error instanceof KioskApiError && error.body != null
                  ? JSON.stringify(error.body)
                  : null,
              mobileReference: base.reference,
            },
          ),
        );
        return { ok: false, message };
      } finally {
        setValidating(false);
      }
    },
    [
      customer,
      lines,
      orderType,
      reservationId,
      setMobilePaymentPayload,
      tableNumber,
      totals,
    ],
  );

  return { validate, validating };
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
