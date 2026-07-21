import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { OrderTypeScreen } from './OrderTypeScreen';

const meta = {
  title: 'Modules/Introduction/OrderType',
  component: OrderTypeScreen,
  decorators: [withI18nStorybook],
  args: {
    onContinue: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof OrderTypeScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
