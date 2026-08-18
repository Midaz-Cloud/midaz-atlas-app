import {
  processKioskOrder,
  type ProcessKioskOrderParams,
} from '@modules/payment/processing/services/processKioskOrder';
import type { ProcessKioskOrderResult } from '@modules/payment/processing/types';

import {
  canRetryFailedPaymentOrder,
  retryFailedPaymentOrder,
  type RetryFailedPaymentOrderParams,
  type RetryFailedPaymentOrderResult,
} from './retryFailedPaymentOrder';
import { getFailedPayment } from '@shared/persistence';

export type RetryCustomerFiscalEmitParams = {
  failedPaymentId?: number | null;
  salvage: Omit<RetryFailedPaymentOrderParams, 'id'>;
  session: ProcessKioskOrderParams;
};

function mapSalvageResult(
  result: RetryFailedPaymentOrderResult,
  fallbackOrderId: string,
): ProcessKioskOrderResult {
  if (result.ok) {
    if (result.printWarning) {
      return {
        status: 'ticket_print_failed',
        orderId: result.displayOrderNumber,
        shortCode: result.shortCode,
        message: result.printWarning,
      };
    }
    return { status: 'ok', orderId: result.displayOrderNumber };
  }
  return {
    status: 'fiscal_error',
    orderId: fallbackOrderId,
    message: result.message,
  };
}

/**
 * Customer-facing fiscal retry after a paid cart.
 * Prefers `failed_payments` salvage (no second POS charge / no duplicate order).
 * Falls back to the in-session `processKioskOrder` pipeline with demo fiscal
 * short-circuit disabled.
 */
export async function retryCustomerFiscalEmit(
  params: RetryCustomerFiscalEmitParams,
): Promise<ProcessKioskOrderResult> {
  const fallbackOrderId =
    params.session.existingRegisteredOrder?.displayOrderNumber ?? '';

  if (params.failedPaymentId != null) {
    const record = await getFailedPayment(params.failedPaymentId);
    if (record && canRetryFailedPaymentOrder(record)) {
      const result = await retryFailedPaymentOrder({
        id: params.failedPaymentId,
        ...params.salvage,
      });
      return mapSalvageResult(result, fallbackOrderId || String(params.failedPaymentId));
    }
  }

  return processKioskOrder(
    {
      ...params.session,
      skipSimulatedFiscalError: true,
    },
    () => undefined,
  );
}
