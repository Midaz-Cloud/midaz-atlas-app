import { kioskScale } from '@shared/utils';

/** Icon and hero image sizes for P1–P3 (scaled up for 1080×1920 kiosk). */
export const introductionLayout = {
  /** P1 · home */
  /** ~full content width on 1080px kiosk (screen − horizontal padding). */
  logoWidth: kioskScale(1040),
  logoHeight: kioskScale(340),
  globeIconSize: kioskScale(50),
  touchRingSize: kioskScale(220),
  touchIconWidth: kioskScale(72),
  touchIconHeight: kioskScale(83),

  /** P2 · language flags */
  flagWidth: kioskScale(130),
  flagHeight: kioskScale(94),

  /** P3 · order-type hero PNGs */
  orderTypeImageWidthDineIn: kioskScale(560),
  orderTypeImageHeightDineIn: kioskScale(392),
  orderTypeImageTopDineIn: kioskScale(-64),
  orderTypeImageWidthTakeOut: kioskScale(288),
  orderTypeImageHeightTakeOut: kioskScale(372),
  orderTypeImageTopTakeOut: kioskScale(-70),
  orderTypeImageLeftTakeOut: kioskScale(188),
} as const;
