import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconContactPage from '@assets/images/customer/icon-contact-page.svg';

/** Hero icon for P8.2 billing register (Figma 205:175). */
export function CustomerBillingHeroIcon() {
  const colors = useKioskScreenColors();
  const size = kioskScreenLayout.customerBillingHeroIconSize;

  return (
    <IconContactPage
      width={size}
      height={size}
      color={colors.title}
    />
  );
}
