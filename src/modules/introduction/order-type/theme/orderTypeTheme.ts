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

/**
 * Variante para 3 opciones. El layout original es de alto fijo y pensado para dos
 * (480 de alto por opción + 72 de gap = 1032); tres no entran y la última quedaba
 * fuera de cuadro. Se achica solo el eje vertical —el ancho de tarjeta no cambia,
 * así la etiqueta sigue teniendo lugar— y la imagen se escala en ambos ejes para
 * no deformarse. El panel limita a 3, no hace falta una variante para más.
 */
const COMPACT_RATIO = 2 / 3;

export const orderTypeCompactLayout = {
  optionsGap: kioskScale(36),
  optionHeight: orderTypeLayout.optionHeight * COMPACT_RATIO,
  cardTop: orderTypeLayout.cardTop * COMPACT_RATIO,
  cardHeight: orderTypeLayout.cardHeight * COMPACT_RATIO,
  cardRadius: orderTypeLayout.cardRadius * COMPACT_RATIO,
  imageScale: COMPACT_RATIO,
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
