import { introductionLayout } from '../../theme';
import { kioskScale } from '@shared/utils';

/** P3 order-type hero cards — Figma node 20:467. */
export const orderTypeLayout = {
  optionsGap: kioskScale(72),
  optionWidth: kioskScale(664),
  optionHeight: kioskScale(480),
  cardWidth: kioskScale(649),
  cardHeight: kioskScale(256),
  cardRadius: kioskScale(60.009),
  cardTop: kioskScale(214.71),
  cardHorizontalInset: kioskScale(15),
  imageWidthDineIn: introductionLayout.orderTypeImageWidthDineIn,
  imageHeightDineIn: introductionLayout.orderTypeImageHeightDineIn,
  imageTopDineIn: introductionLayout.orderTypeImageTopDineIn,
  imageWidthTakeOut: introductionLayout.orderTypeImageWidthTakeOut,
  imageHeightTakeOut: introductionLayout.orderTypeImageHeightTakeOut,
  imageTopTakeOut: introductionLayout.orderTypeImageTopTakeOut,
  imageLeftTakeOut: introductionLayout.orderTypeImageLeftTakeOut,
} as const;

export const orderTypeShadows = {
  heroCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: kioskScale(2.29) },
    shadowOpacity: 0.25,
    shadowRadius: kioskScale(5),
    elevation: 4,
  },
} as const;
