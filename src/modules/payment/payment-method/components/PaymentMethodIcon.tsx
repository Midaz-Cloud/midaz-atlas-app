import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import IconPos from '@assets/images/payment/icon-pos.svg';
import IconMobile from '@assets/images/payment/icon-mobile-payment.svg';
import IconCash from '@assets/images/payment/icon-cash.svg';
import IconZelle from '@assets/images/payment/icon-zelle.svg';
import type { PaymentMethodId } from '../../types';

const FIGMA_ICON_SIZE: Record<PaymentMethodId, { width: number; height: number }> = {
  pos: { width: 64.8, height: 57.6 },
  mobile: { width: 49, height: 71 },
  cash: { width: 78, height: 78 },
  zelle: { width: 45, height: 74 },
};

export type PaymentMethodIconProps = {
  methodId: PaymentMethodId;
};

export function PaymentMethodIcon({ methodId }: PaymentMethodIconProps) {
  const colors = useKioskScreenColors();
  const { width, height } = FIGMA_ICON_SIZE[methodId];
  const w = kioskScale(width);
  const h = kioskScale(height);
  const iconColor = colors.priceAccent;

  let icon: ReactNode;
  switch (methodId) {
    case 'pos':
      icon = <IconPos width={w} height={h} color={iconColor} />;
      break;
    case 'mobile':
      icon = <IconMobile width={w} height={h} color={iconColor} />;
      break;
    case 'cash':
      icon = <IconCash width={w} height={h} color={iconColor} />;
      break;
    case 'zelle':
      icon = <IconZelle width={w} height={h} />;
      break;
  }

  return <View style={styles.wrap}>{icon}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
