import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '@modules/payment/components/paymentFlowStoryDecorators';

import { OutOfStockScreen } from './OutOfStockScreen';

/** Figma 66:44 · P17 Sin stock */
const meta = {
  title: 'Modules/Ordering/Stock/OutOfStockScreen',
  component: OutOfStockScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    onBack: fn(),
    onViewSimilar: fn(),
  },
} satisfies Meta<typeof OutOfStockScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
