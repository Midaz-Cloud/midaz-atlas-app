import { useCallback, useState } from 'react';

import {
  isValidateMobilePaymentSuccess,
  KioskApiError,
  validateMobilePaymentWithApi,
} from '@shared/api/kiosk';
import { useKioskOrder } from '@shared/kiosk-order';
import type { MobilePaymentPayload } from '@shared/kiosk-order';

export type MobilePaymentValidationResult =
  | { ok: true; payload: MobilePaymentPayload }
  | { ok: false; message: string };

export function useMobilePaymentValidation() {
  const { totals, setMobilePaymentPayload } = useKioskOrder();
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
          return {
            ok: false,
            message: response.message || 'Pago móvil rechazado',
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
        return { ok: false, message };
      } finally {
        setValidating(false);
      }
    },
    [setMobilePaymentPayload, totals.totalVes],
  );

  return { validate, validating };
}
