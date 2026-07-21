import { kioskConfig } from '@shared/config/kiosk';

import type { IntroductionStep } from './types';

export type IntroductionFlowFlags = {
  orderTypeSelectionEnabled: boolean;
};

export function getIntroductionFlowFlags(
  orderTypeSelectionEnabled?: boolean,
): IntroductionFlowFlags {
  return {
    orderTypeSelectionEnabled:
      orderTypeSelectionEnabled ?? kioskConfig.orderTypeSelectionEnabled,
  };
}

export function getInitialIntroductionStep(): IntroductionStep {
  return 'home';
}

/** Flujo principal desde P1: omite idioma (P2 solo vía botón en home). */
export function getStepAfterHome(flags: IntroductionFlowFlags): IntroductionStep | 'complete' {
  if (flags.orderTypeSelectionEnabled) {
    return 'orderType';
  }
  return 'complete';
}
