import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout, SelectionOptionCard } from '@shared/components';
import { kioskScreenLayout } from '@shared/theme';

import type { AppLocale } from '@shared/i18n/types';

import { languageSelectionColors } from './theme';
import { LanguageFlagIcon } from './components';
import { useLanguageSelection } from './hooks';

type LanguageSelectionScreenProps = {
  enabledLocales: readonly AppLocale[];
  onContinue: () => void;
  onBack: () => void;
};

export function LanguageSelectionScreen({
  enabledLocales,
  onContinue,
  onBack,
}: LanguageSelectionScreenProps) {
  const { t } = useTranslation('introduction');
  const { selectLanguage } = useLanguageSelection({ onContinue });

  return (
    <KioskScreenLayout
      testID="introduction-language-selection"
      showPattern
      contentAlign="top"
      onBack={onBack}
      title={t('languageSelection.title')}
      subtitle={t('languageSelection.subtitle')}
      contentStyle={styles.content}>
      <View style={styles.options}>
        {enabledLocales.includes('es') ? (
          <SelectionOptionCard
            variant="featured"
            label={t('languageSelection.spanishLabel')}
            description={t('languageSelection.spanishDescription')}
            leading={<LanguageFlagIcon locale="es" />}
            leadingBackgroundColor={languageSelectionColors.iconBgSpanish}
            testID="language-option-es"
            onPress={() => void selectLanguage('es')}
          />
        ) : null}
        {enabledLocales.includes('en') ? (
          <SelectionOptionCard
            variant="featured"
            label={t('languageSelection.englishLabel')}
            description={t('languageSelection.englishDescription')}
            leading={<LanguageFlagIcon locale="en" />}
            leadingBackgroundColor={languageSelectionColors.iconBgEnglish}
            testID="language-option-en"
            onPress={() => void selectLanguage('en')}
          />
        ) : null}
      </View>
    </KioskScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: kioskScreenLayout.optionsBottomPadding,
  },
  options: {
    width: '100%',
    gap: kioskScreenLayout.optionsGap,
  },
});
