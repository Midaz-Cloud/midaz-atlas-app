import type { Decorator } from '@storybook/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { kioskConfig } from '@shared/config/kiosk';

import i18n from './i18n';
import { SessionLocaleProvider } from './SessionLocaleProvider';
import type { AppLocale } from './types';

type LocaleParameter = AppLocale | undefined;

export const withI18nStorybook: Decorator = (Story, context) => {
  const locale =
    (context.parameters.locale as LocaleParameter) ?? kioskConfig.defaultLocale;

  void i18n.changeLanguage(locale);

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <SessionLocaleProvider initialLocale={locale}>
          <Story />
        </SessionLocaleProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
};
