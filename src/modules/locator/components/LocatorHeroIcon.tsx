import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconAdsClick from '@assets/images/locator/icon-ads-click.svg';

/** Hero icon P20 · Localizador (Figma 180:248 ads_click). */
export function LocatorHeroIcon() {
  const colors = useKioskScreenColors();
  const size = kioskScreenLayout.locatorHeroIconSize;

  return (
    <IconAdsClick
      width={size}
      height={size}
      color={colors.title}
    />
  );
}
