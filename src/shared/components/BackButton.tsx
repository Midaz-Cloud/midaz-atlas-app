import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import IconBack from '@assets/images/kiosk/icon-back.svg';
import { kioskScreenLayout, kioskScreenShadows, useKioskScreenColors } from '@shared/theme';

type BackButtonProps = {
  onPress: () => void;
  testID?: string;
};

export function BackButton({ onPress, testID = 'kiosk-back' }: BackButtonProps) {
  const { t } = useTranslation('common');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          width: kioskScreenLayout.backButtonSize,
          height: kioskScreenLayout.backButtonSize,
          borderRadius: kioskScreenLayout.backButtonSize / 2,
          backgroundColor: colors.backButtonBackground,
          borderWidth: kioskScreenLayout.backButtonBorderWidth,
          borderColor: colors.backButtonBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('back')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kioskScreenShadows.backButton,
        pressed && styles.pressed,
      ]}
      testID={testID}>
      <IconBack
        width={kioskScreenLayout.backIconWidth}
        height={kioskScreenLayout.backIconHeight}
        color={colors.title}
      />
    </Pressable>
  );
}
