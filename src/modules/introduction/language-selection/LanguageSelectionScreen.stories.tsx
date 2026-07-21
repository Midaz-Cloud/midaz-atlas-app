import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { LanguageSelectionScreen } from './LanguageSelectionScreen';

const meta = {
  title: 'Modules/Introduction/LanguageSelection',
  component: LanguageSelectionScreen,
  decorators: [withI18nStorybook],
  args: {
    enabledLocales: ['es', 'en'],
    onContinue: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof LanguageSelectionScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { locale: 'es' },
};

export const EnglishLocale: Story = {
  parameters: { locale: 'en' },
};
