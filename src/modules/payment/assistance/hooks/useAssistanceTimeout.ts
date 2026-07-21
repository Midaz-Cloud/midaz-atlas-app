import { useEffect } from 'react';

import { getDemoAssistanceTimeoutMs } from '@shared/config';

export function useAssistanceTimeout(
  enabled: boolean,
  timeoutMs: number = getDemoAssistanceTimeoutMs(),
  onTimeout: () => void,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setTimeout(() => {
      onTimeout();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [enabled, onTimeout, timeoutMs]);
}
