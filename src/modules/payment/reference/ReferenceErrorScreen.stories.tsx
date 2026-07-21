import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { ReferenceErrorScreen } from './ReferenceErrorScreen';

const meta = {
  title: 'Modules/Payment/Reference/ReferenceErrorScreen',
  component: ReferenceErrorScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    blocked: false,
    onBack: fn(),
    onRetry: fn(),
    onRequestHelp: fn(),
  },
} satisfies Meta<typeof ReferenceErrorScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const Blocked: Story = {
  args: { blocked: true },
};
