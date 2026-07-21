import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@shared/components';
import {
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import {
  MenuSearchField,
  type MenuSearchFocusAccent,
} from './MenuSearchField';

type MenuSearchHeaderProps = {
  paddingTop: number;
  onBack: () => void;
  value: string;
  onChangeText: (text: string) => void;
  focusAccent?: MenuSearchFocusAccent;
};

/** P4 · back + search en una fila (layout exclusivo del menú). */
export function MenuSearchHeader({
  paddingTop,
  onBack,
  value,
  onChangeText,
  focusAccent,
}: MenuSearchHeaderProps) {
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          backgroundColor: colors.cardBackground,
          paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
          paddingBottom: kioskScreenLayout.searchSectionPaddingVertical,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.menuSearchHeaderGap,
        },
        searchWrap: {
          flex: 1,
        },
      }),
    [colors],
  );

  return (
    <View
      style={[styles.section, kioskScreenShadows.menuCard, { paddingTop }]}
      testID="menu-search-header">
      <View style={styles.row}>
        <BackButton onPress={onBack} testID="menu-back" />
        <View style={styles.searchWrap}>
          <MenuSearchField
            value={value}
            onChangeText={onChangeText}
            focusAccent={focusAccent}
          />
        </View>
      </View>
    </View>
  );
}
