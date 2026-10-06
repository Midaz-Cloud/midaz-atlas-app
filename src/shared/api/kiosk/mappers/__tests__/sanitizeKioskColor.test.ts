import { sanitizeKioskColor } from '../sanitizeKioskColor';

describe('sanitizeKioskColor', () => {
  it.each(['#fff', '#FFFF', '#004be0', '#004be0cc', 'rgb(1, 2, 3)', 'rgba(255,255,255,0.6)', 'hsl(210, 50%, 40%)', 'hsla(210deg,50%,40%,0.5)'])(
    'keeps valid color %s',
    (color) => {
      expect(sanitizeKioskColor(color, '#000000')).toBe(color);
    },
  );

  it.each(['hsl(var(--primary))', 'hsl(var(--foreground))', 'var(--primary)', 'red', '', '   ', '#12', 'rgb(a,b,c)'])(
    'falls back for %p',
    (color) => {
      expect(sanitizeKioskColor(color, '#004be0')).toBe('#004be0');
    },
  );

  it('falls back to null for optional colors and non-strings', () => {
    expect(sanitizeKioskColor(undefined, null)).toBeNull();
    expect(sanitizeKioskColor(42, null)).toBeNull();
    expect(sanitizeKioskColor('hsl(var(--primary))', null)).toBeNull();
    expect(sanitizeKioskColor(' #ffffff ', null)).toBe('#ffffff');
  });
});
