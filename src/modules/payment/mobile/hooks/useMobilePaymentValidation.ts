import { useCallback, useState } from 'react';

import {
  isValidateMobilePaymentSuccess,
  KioskApiError,
  logKioskCheckoutPayload,
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

        logKioskCheckoutPayload('mobile validate decision', {
          success: response.success,
          status: response.status,
          disglobalRef: response.disglobalRef,
          message: response.message,
          accepted: isValidateMobilePaymentSuccess(response),
        });

        if (!isValidateMobilePaymentSuccess(response)) {
          // Keep API message for logs / persistence / title sniffing only.
          // UI does not show response.message raw (see ReferenceErrorScreen).
          const message = response.message || 'Pago móvil rechazado';
          // const uiMessage = response.message; // commented: do not surface backend message as copy
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
        logKioskCheckoutPayload('mobile validate error', {
          message,
          statusCode: error instanceof KioskApiError ? error.statusCode : undefined,
          body: error instanceof KioskApiError ? error.body : undefined,
        });
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
