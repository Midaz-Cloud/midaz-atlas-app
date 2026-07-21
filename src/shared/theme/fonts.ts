import { Platform, type TextStyle } from 'react-native';

/** Asset name after adding FunnelDisplay-Bold.ttf to assets/fonts/ */
export const fontFamily = {
  display: 'FunnelDisplay-Bold',
} as const;

/**
 * Display typography (Funnel Display Bold).
 * Falls back to system bold until the font file is linked.
 */
export function displayTextStyle(extra?: TextStyle): TextStyle {
  return {
    fontFamily: Platform.select({
      ios: fontFamily.display,
      android: fontFamily.display,
      default: undefined,
    }),
    fontWeight: '700',
    ...extra,
  };
}

/** Body / secondary copy (Funnel Display Regular when font file is linked). */
export function bodyTextStyle(extra?: TextStyle): TextStyle {
  return {
    fontWeight: '400',
    ...extra,
  };
}

/** Medium weight rows (Figma Funnel Display Medium). */
export function mediumTextStyle(extra?: TextStyle): TextStyle {
  return {
    fontWeight: '500',
    ...extra,
  };
}
