import { useEffect, useRef } from 'react';

export function useOrderOutcomeAutoDismiss(
  enabled: boolean,
  delayMs: number,
  onDismiss: () => void,
) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setTimeout(() => {
      onDismissRef.current();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [enabled, delayMs]);
}
