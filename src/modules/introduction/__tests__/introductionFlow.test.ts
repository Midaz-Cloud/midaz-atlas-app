import {
  getIntroductionFlowFlags,
  getStepAfterHome,
} from '../introductionFlow';

describe('introductionFlow', () => {
  it('routes to order type when food service enabled', () => {
    const flags = getIntroductionFlowFlags(true);
    expect(getStepAfterHome(flags)).toBe('orderType');
  });

  it('skips order type when food service disabled', () => {
    const flags = getIntroductionFlowFlags(false);
    expect(getStepAfterHome(flags)).toBe('complete');
  });
});
