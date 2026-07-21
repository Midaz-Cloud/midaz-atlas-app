import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconIdCard from '@assets/images/payment/mobile/icon-id-card.svg';

/** Hero P10 (d) · Nueva cédula (Figma 205:553). */
export function PaymentChangeDocumentHeroIcon() {
  const colors = useKioskScreenColors();
  const size = kioskScreenLayout.customerBillingHeroIconSize;

  return <IconIdCard width={size} height={size} color={colors.title} />;
}
