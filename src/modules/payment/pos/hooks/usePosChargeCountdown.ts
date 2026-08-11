import { useEffect, useState } from 'react';

import { ECR_PAYMENT_TIMEOUT_MS } from '@shared/peripherals/ecr/ecrPaymentTimeoutMs';

import { formatCountdownMmSs } from '../utils/formatCountdownMmSs';
import type { PosChargePhase } from '../types';

/**
 * Counts down the POS terminal wait window while `waiting_pos`.
 * Freezes the last value once we move to `confirming`.
 */
export function usePosChargeCountdown(phase: PosChargePhase) {
  const totalSeconds = Math.ceil(ECR_PAYMENT_TIMEOUT_MS / 1000);
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (phase !== 'waiting_pos') {
      return;
    }

    setSecondsRemaining(totalSeconds);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSecondsRemaining(Math.max(0, totalSeconds - elapsed));
    }, 250);

    return () => clearInterval(id);
  }, [phase, totalSeconds]);

  return {
    secondsRemaining,
    display: formatCountdownMmSs(secondsRemaining),
  };
}
