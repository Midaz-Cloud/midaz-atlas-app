import { useTranslation } from 'react-i18next';

import type { OrderProcessingPhase } from '../types';

export function useOrderProcessingScreen(phase: OrderProcessingPhase) {
  const { t } = useTranslation('payment');

  return {
    title: t('processing.title'),
    statusLabel: t(`processing.status.${phase}`),
  };
}
