import { Dimensions } from 'react-native';

/** Figma kiosk frame width (P1 Idle). */
export const KIOSK_DESIGN_WIDTH = 1080;

export function kioskScale(size: number): number {
  const { width } = Dimensions.get('window');
  return (width / KIOSK_DESIGN_WIDTH) * size;
}
