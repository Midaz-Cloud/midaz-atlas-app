jest.mock('react-native-config', () => ({
  KIOSK_DEMO_MODE: 'true',
  KIOSK_DEMO_REFERENCE_CODE: '999999',
  KIOSK_DEMO_SCENARIO: 'payment_fail',
  KIOSK_DEMO_SHORT_TIMEOUTS: 'true',
}));

import {
  getDemoProcessingOutcome,
  getDemoReferenceCode,
  getDemoScenario,
  shouldSimulatePosFailure,
  shouldUseShortTimeouts,
} from '../demo';

describe('demo config (demo mode on)', () => {
  it('reads reference code and scenario from env', () => {
    expect(getDemoReferenceCode()).toBe('999999');
    expect(getDemoScenario()).toBe('payment_fail');
    expect(shouldUseShortTimeouts()).toBe(true);
  });

  it('maps scenario to processing outcome', () => {
    expect(getDemoProcessingOutcome()).toBe('failed');
    expect(shouldSimulatePosFailure()).toBe(false);
  });
});
