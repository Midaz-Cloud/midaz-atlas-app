import { formatEcrTerminalAmountHint, toEcrTerminalAmount } from '../toEcrTerminalAmount';

describe('toEcrTerminalAmount', () => {
  it('maps 1 Bs to 100', () => {
    expect(toEcrTerminalAmount(1)).toBe(100);
  });

  it('maps 0.1 Bs to 10', () => {
    expect(toEcrTerminalAmount(0.1)).toBe(10);
  });

  it('maps 0.01 Bs to 1', () => {
    expect(toEcrTerminalAmount(0.01)).toBe(1);
  });

  it('formats hint for display', () => {
    expect(formatEcrTerminalAmountHint(100)).toContain('1.00 Bs');
    expect(formatEcrTerminalAmountHint(100)).toContain('100');
  });
});
