import { formatPrimaryPriceCompact, formatProductPriceLabel } from '../formatKioskPrice';

describe('formatProductPriceLabel', () => {
  it('shows only USD when primary currency is USD', () => {
    const label = formatProductPriceLabel(2, 'USD', 1061);
    expect(label).toBe('USD 2.00');
    expect(label).not.toContain('Bs');
  });

  it('shows only Bs when primary currency is VES', () => {
    const label = formatProductPriceLabel(150, 'VES', undefined);
    expect(label).toContain('Bs');
    expect(label).not.toContain('$');
  });
});

describe('formatPrimaryPriceCompact', () => {
  it('uses $ for USD', () => {
    expect(formatPrimaryPriceCompact(5, 'USD')).toBe('$5.00');
  });

  it('uses Bs for VES', () => {
    const label = formatPrimaryPriceCompact(150, 'VES');
    expect(label).toContain('Bs');
    expect(label).not.toContain('$');
  });
});
