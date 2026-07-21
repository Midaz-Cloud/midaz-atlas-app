import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { brand, displayTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { introductionLayout } from '../../theme';

import { TouchStartIcon } from './TouchStartIcon';

const ACTIVE_OPACITY = 0.75;

type TouchToStartCtaProps = {
  onPress: () => void;
  /** Kiosk config `titleColor` (ring, label and icon). */
  accentColor?: string;
};

export function TouchToStartCta({ onPress, accentColor }: TouchToStartCtaProps) {
  const { t } = useTranslation('introduction');
  const ringColor = accentColor ?? brand.orange;

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={ACTIVE_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={t('home.tapToStart')}
      testID="introduction-home-start-cta">
      <View style={[styles.ring, { borderColor: ringColor }]}>
        <View style={styles.iconWrap}>
          <TouchStartIcon
            width={introductionLayout.touchIconWidth}
            height={introductionLayout.touchIconHeight}
            color={ringColor}
          />
        </View>
      </View>
      <Text style={[styles.label, { color: ringColor }]}>{t('home.tapToStart')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: kioskScale(25),
  },
  ring: {
    width: introductionLayout.touchRingSize,
    height: introductionLayout.touchRingSize,
    borderRadius: introductionLayout.touchRingSize / 2,
    borderWidth: kioskScale(5.76),
    borderColor: brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    padding: kioskScale(5.76),
  },
  iconWrap: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...displayTextStyle(),
    fontSize: kioskScale(55),
    lineHeight: kioskScale(80.64),
    color: brand.orange,
    textAlign: 'center',
    letterSpacing: kioskScale(2.88),
    textTransform: 'uppercase',
  },
});
