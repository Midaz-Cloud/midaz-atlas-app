import { brand } from '@shared/theme';

import { appearanceTextColor } from '../appearanceColors';

describe('appearanceColors', () => {
  it('returns valid hex from API', () => {
    expect(appearanceTextColor('#FFF1E1', brand.cream)).toBe('#FFF1E1');
  });

  it('falls back when value is missing or invalid', () => {
    expect(appearanceTextColor(undefined, brand.cream)).toBe(brand.cream);
    expect(appearanceTextColor('rgba(255,255,255,0.85)', brand.cream)).toBe(brand.cream);
  });
});
