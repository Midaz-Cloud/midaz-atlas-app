import { kioskConfig } from './kiosk';
import { getEnvString, isKioskDemoMode, parseBooleanEnv } from './env';
import Config from 'react-native-config';

export type DemoScenario = 'default' | 'fiscal_error' | 'payment_fail' | 'pos_fail';

const DEFAULT_REFERENCE_CODE = '123456';
const DEFAULT_SCENARIO: DemoScenario = 'default';

const SCENARIOS: readonly DemoScenario[] = [
  'default',
  'fiscal_error',
  'payment_fail',
  'pos_fail',
] as const;

function parseDemoScenario(raw: string | undefined): DemoScenario {
  if (raw && (SCENARIOS as readonly string[]).includes(raw)) {
    return raw as DemoScenario;
  }
  return DEFAULT_SCENARIO;
}

export function getDemoReferenceCode(): string {
  if (!isKioskDemoMode) {
    return DEFAULT_REFERENCE_CODE;
  }
  return getEnvString('KIOSK_DEMO_REFERENCE_CODE') ?? DEFAULT_REFERENCE_CODE;
}

export function getDemoScenario(): DemoScenario {
  if (!isKioskDemoMode) {
    return DEFAULT_SCENARIO;
  }
  return parseDemoScenario(getEnvString('KIOSK_DEMO_SCENARIO'));
}

export function shouldUseShortTimeouts(): boolean {
  if (!isKioskDemoMode) {
    return false;
  }
  return parseBooleanEnv(Config.KIOSK_DEMO_SHORT_TIMEOUTS);
}

export type DemoProcessingOutcome = 'ok' | 'fiscal_error' | 'failed';

/** Maps demo scenario to P13 result (only when demo mode is on). */
export function getDemoProcessingOutcome(): DemoProcessingOutcome {
  switch (getDemoScenario()) {
    case 'fiscal_error':
      return 'fiscal_error';
    case 'payment_fail':
      return 'failed';
    default:
      return 'ok';
  }
}

export function shouldSimulatePosFailure(): boolean {
  return isKioskDemoMode && getDemoScenario() === 'pos_fail';
}

export const demoTimeouts = {
  referenceVerifyDelayMs: (short: boolean) => (short ? 1_000 : 2_000),
  referenceVerifyTimeoutMs: 15_000,
  processingPhaseDelayMs: (short: boolean) => (short ? 700 : 1_400),
} as const;

export function getDemoReferenceVerifyDelayMs(): number {
  return demoTimeouts.referenceVerifyDelayMs(shouldUseShortTimeouts());
}

export function getDemoReferenceVerifyTimeoutMs(): number {
  return demoTimeouts.referenceVerifyTimeoutMs;
}

export function getDemoProcessingPhaseDelayMs(): number {
  return demoTimeouts.processingPhaseDelayMs(shouldUseShortTimeouts());
}

/** Optional shorter P16/P19 timers when demo short timeouts are enabled. */
export function getDemoInactivityMs(): { idleMs: number; graceMs: number } {
  if (!isKioskDemoMode || !shouldUseShortTimeouts()) {
    return {
      idleMs: kioskConfig.inactivityIdleMs,
      graceMs: kioskConfig.inactivityGraceMs,
    };
  }
  return {
    idleMs: Math.round(kioskConfig.inactivityIdleMs / 2),
    graceMs: Math.round(kioskConfig.inactivityGraceMs / 2),
  };
}

export function getDemoAssistanceTimeoutMs(): number {
  if (!isKioskDemoMode || !shouldUseShortTimeouts()) {
    return kioskConfig.assistanceTimeoutMs;
  }
  return Math.round(kioskConfig.assistanceTimeoutMs / 2);
}
