import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import IconSearch from '@assets/images/ordering/menu/icon-search.svg';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type MenuSearchFocusAccent = 'orange' | 'blue';

type MenuSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Borde al enfocar; ambos acentos usan `primary` del config. */
  focusAccent?: MenuSearchFocusAccent;
  /** Control externo del estado focused (p. ej. Storybook). */
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  testID?: string;
};

export function MenuSearchField({
  value,
  onChangeText,
  focusAccent = 'orange',
  focused: focusedProp,
  onFocus,
  onBlur,
  testID = 'menu-search-input',
}: MenuSearchFieldProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const [focusedInternal, setFocusedInternal] = useState(false);
  const isFocused = focusedProp ?? focusedInternal;

  const focusBorderColor =
    focusAccent === 'blue'
      ? colors.searchBorderFocusBlue
      : colors.searchBorderFocusOrange;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        field: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.searchBackground,
          borderRadius: 9999,
          borderWidth: kioskScreenLayout.searchBorderWidth,
          borderColor: colors.searchBorderDefault,
          minHeight:
            kioskScreenLayout.searchInputPaddingVertical * 2 +
            kioskScreenLayout.searchIconSize,
        },
        icon: {
          marginLeft: kioskScreenLayout.searchIconInset,
          marginRight: kioskScreenLayout.searchSectionPaddingVertical * 0.5,
        },
        input: {
          flex: 1,
          paddingTop: kioskScreenLayout.searchInputPaddingVertical,
          paddingBottom: kioskScreenLayout.searchInputPaddingVertical,
          paddingRight: kioskScreenLayout.searchInputPaddingRight,
          fontSize: kioskScreenLayout.searchFontSize,
          color: colors.title,
        },
      }),
    [colors],
  );

  const handleFocus = useCallback(() => {
    setFocusedInternal(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setFocusedInternal(false);
    onBlur?.();
  }, [onBlur]);

  return (
    <View
      style={[
        styles.field,
        isFocused && {
          borderColor: focusBorderColor,
          borderWidth: kioskScreenLayout.searchBorderWidth,
        },
      ]}>
      <View style={styles.icon} pointerEvents="none">
        <IconSearch
          width={kioskScreenLayout.searchIconSize}
          height={kioskScreenLayout.searchIconSize}
        />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={t('menu.searchPlaceholder')}
        placeholderTextColor={colors.menuSectionMuted}
        accessibilityLabel={t('menu.searchPlaceholder')}
        testID={testID}
      />
    </View>
  );
}
