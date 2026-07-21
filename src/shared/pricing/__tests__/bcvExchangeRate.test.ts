import { resolveBcvExchangeRate } from '../bcvExchangeRate';

const rates = { usd: 530.5047, eur: 615.5021 };

describe('resolveBcvExchangeRate', () => {
  it('returns USD rate when primary currency is USD', () => {
    expect(resolveBcvExchangeRate('USD', rates)).toBe(530.5047);
  });

  it('returns EUR rate when primary currency is EUR', () => {
    expect(resolveBcvExchangeRate('EUR', rates)).toBe(615.5021);
  });

  it('returns null when primary currency is VES', () => {
    expect(resolveBcvExchangeRate('VES', rates)).toBeNull();
  });

  it('returns null when exchange rates are missing', () => {
    expect(resolveBcvExchangeRate('USD', null)).toBeNull();
  });

  it('defaults non-VES unknown codes to USD rate', () => {
    expect(resolveBcvExchangeRate('GBP', rates)).toBe(530.5047);
  });
});
