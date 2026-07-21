import { useCallback, useEffect, useRef } from 'react';

import { useKioskOrder } from '@shared/kiosk-order';

import type { TransferPaymentMethodId } from '../../types';
import {
  verifyPaymentReference,
  type VerifyReferenceResult,
} from '../services/verifyPaymentReference';

export type UseReferenceVerificationParams = {
  methodId: TransferPaymentMethodId;
  suffix: string;
  enabled: boolean;
  onResult: (result: VerifyReferenceResult) => void;
};

export function useReferenceVerification({
  methodId,
  suffix,
  enabled,
  onResult,
}: UseReferenceVerificationParams) {
  const { totals } = useKioskOrder();
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const run = useCallback(async () => {
    const result = await verifyPaymentReference({
      methodId,
      suffix,
      orderTotalUsd: totals.totalUsd,
    });
    onResultRef.current(result);
  }, [methodId, suffix, totals.totalUsd]);

  useEffect(() => {
    if (!enabled || suffix.length !== 6) {
      return;
    }
    void run();
  }, [enabled, suffix, run]);
}
