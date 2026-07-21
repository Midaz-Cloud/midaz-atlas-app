import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { HomeScreen } from './HomeScreen';

const meta = {
  title: 'Modules/Introduction/Home',
  component: HomeScreen,
  decorators: [withI18nStorybook],
  args: {
    onStart: fn(),
    onLanguagePress: fn(),
    languageSwitcherEnabled: true,
  },
} satisfies Meta<typeof HomeScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
