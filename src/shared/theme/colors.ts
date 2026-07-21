import { brand } from './brand';

/**
 * Semantic colors for kiosk / digital mode (Modo 2 — blue background, amber accent).
 * See docs/MIDAZ_BRAND.md for other modes.
 */
export const colors = {
  ...brand,

  background: brand.blue,
  backgroundDark: brand.navy,
  backgroundWarm: brand.amber,
  backgroundNeutral: brand.offWhite,
  surface: brand.white,
  surfaceWarm: brand.cream,

  text: brand.white,
  textOnLight: brand.navy,
  textSecondary: brand.sky,
  textMutedOnLight: '#5a6b8a',

  primary: brand.blue,
  primaryPressed: '#0039a8',
  accent: brand.amber,
  accentPressed: brand.gold,

  border: brand.sky,
  borderOnLight: '#d0d8e8',
  disabled: '#8aa8e8',
  disabledText: brand.sky,
} as const;
