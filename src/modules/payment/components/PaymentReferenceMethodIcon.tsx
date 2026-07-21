import type { ReactNode } from 'react';

import IconMobile from '@assets/images/payment/mobile/icon-mobile.svg';
import IconZelle from '@assets/images/payment/zelle/icon-zelle-hero.svg';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import type { TransferPaymentMethodId } from '../types';

export function PaymentReferenceMethodIcon({
  methodId,
}: {
  methodId: TransferPaymentMethodId;
}): ReactNode {
  const colors = useKioskScreenColors();

  if (methodId === 'mobile') {
    return (
      <IconMobile
        width={kioskScreenLayout.paymentPosHeroIconWidth}
        height={kioskScreenLayout.paymentMobileHeroIconHeight}
        color={colors.priceAccent}
      />
    );
  }
  return (
    <IconZelle
      width={kioskScreenLayout.paymentZelleHeroIconWidth}
      height={kioskScreenLayout.paymentZelleHeroIconHeight}
    />
  );
}
