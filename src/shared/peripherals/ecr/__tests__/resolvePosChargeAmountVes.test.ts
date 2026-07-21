import { getKioskPosTestChargeVes } from '@shared/config';

import {
  isPosTestChargeActive,
  resolvePosChargeAmountVes,
} from '../resolvePosChargeAmountVes';

jest.mock('@shared/config', () => ({
  getKioskPosTestChargeVes: jest.fn(),
}));

describe('resolvePosChargeAmountVes', () => {
  beforeEach(() => {
    jest.mocked(getKioskPosTestChargeVes).mockReturnValue(undefined);
  });

  it('returns cart total when no test charge', () => {
    expect(resolvePosChargeAmountVes(169.36)).toBe(169.36);
    expect(isPosTestChargeActive()).toBe(false);
  });

  it('returns test charge from env when set', () => {
    jest.mocked(getKioskPosTestChargeVes).mockReturnValue(1);
    expect(resolvePosChargeAmountVes(169.36)).toBe(1);
    expect(isPosTestChargeActive()).toBe(true);
  });
});
