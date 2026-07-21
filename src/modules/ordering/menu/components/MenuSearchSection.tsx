import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

type MenuSearchSectionProps = {
  children: ReactNode;
};

/** Franja blanca del menú que envuelve el campo de búsqueda (Figma 35:117). */
export function MenuSearchSection({ children }: MenuSearchSectionProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          backgroundColor: colors.cardBackground,
          paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
          paddingVertical: kioskScreenLayout.searchSectionPaddingVertical,
        },
      }),
    [colors],
  );

  return <View style={[styles.section, kioskScreenShadows.menuCard]}>{children}</View>;
}
