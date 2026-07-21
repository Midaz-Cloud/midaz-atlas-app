import { shouldShowLocatorStep } from '../shouldShowLocatorStep';

describe('shouldShowLocatorStep', () => {
  it('shows locator when table field is enabled and step is pending', () => {
    expect(shouldShowLocatorStep(true, false)).toBe(true);
  });

  it('skips locator when table field is disabled', () => {
    expect(shouldShowLocatorStep(false, false)).toBe(false);
  });

  it('skips locator after validation even when enabled', () => {
    expect(shouldShowLocatorStep(true, true)).toBe(false);
  });
});
