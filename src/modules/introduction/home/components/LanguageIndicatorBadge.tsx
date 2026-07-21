import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import GlobeIcon from '@assets/images/home/globe-icon.svg';
import { brand, displayTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { introductionLayout } from '../../theme';

const ACTIVE_OPACITY = 0.75;

type LanguageIndicatorBadgeProps = {
  onPress: () => void;
};

export function LanguageIndicatorBadge({ onPress }: LanguageIndicatorBadgeProps) {
  const { t } = useTranslation('introduction');

  return (
    <TouchableOpacity
      style={styles.badge}
      onPress={onPress}
      activeOpacity={ACTIVE_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={t('home.languageBadge')}
      testID="introduction-home-language-badge">
      <GlobeIcon
        width={introductionLayout.globeIconSize}
        height={introductionLayout.globeIconSize}
      />
      <Text style={styles.label}>{t('home.languageBadge')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: kioskScale(23),
    paddingVertical: kioskScale(20),
    paddingHorizontal: kioskScale(37),
    borderRadius: 9999,
    borderWidth: kioskScale(2.88),
    borderColor: 'rgba(255, 241, 225, 0.3)',
    backgroundColor: 'rgba(255, 241, 225, 0.15)',
  },
  label: {
    ...displayTextStyle(),
    fontSize: kioskScale(35),
    lineHeight: kioskScale(46),
    color: brand.cream,
  },
});
