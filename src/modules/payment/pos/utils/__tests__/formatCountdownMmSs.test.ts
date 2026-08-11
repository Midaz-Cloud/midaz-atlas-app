import { formatCountdownMmSs } from '../formatCountdownMmSs';

describe('formatCountdownMmSs', () => {
  it('formats full minutes and seconds', () => {
    expect(formatCountdownMmSs(120)).toBe('02:00');
    expect(formatCountdownMmSs(90)).toBe('01:30');
    expect(formatCountdownMmSs(5)).toBe('00:05');
  });

  it('clamps negative values to zero', () => {
    expect(formatCountdownMmSs(-3)).toBe('00:00');
  });
});
