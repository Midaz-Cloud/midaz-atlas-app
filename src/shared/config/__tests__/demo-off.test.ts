jest.mock('react-native-config', () => ({
  KIOSK_DEMO_MODE: 'false',
}));

describe('demo config (demo mode off)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('does not force scenarios or short timeouts', () => {
    const {
      getDemoProcessingOutcome,
      getDemoReferenceCode,
      getDemoScenario,
      shouldSimulatePosFailure,
      shouldUseShortTimeouts,
    } = require('../demo');

    expect(getDemoReferenceCode()).toBe('123456');
    expect(getDemoScenario()).toBe('default');
    expect(shouldUseShortTimeouts()).toBe(false);
    expect(getDemoProcessingOutcome()).toBe('ok');
    expect(shouldSimulatePosFailure()).toBe(false);
  });
});
