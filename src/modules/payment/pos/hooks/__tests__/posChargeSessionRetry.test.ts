import {
  resetPosChargeSessionForTests,
} from '../usePosChargeProcessing';

describe('pos charge session retry', () => {
  afterEach(() => {
    resetPosChargeSessionForTests();
  });

  it('exposes reset so retries are not blocked by a delivered session', () => {
    // Smoke: module reset is callable (session is module-private).
    expect(() => resetPosChargeSessionForTests()).not.toThrow();
  });
});
