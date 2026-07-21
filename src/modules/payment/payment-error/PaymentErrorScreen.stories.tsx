import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { PaymentErrorScreen } from './PaymentErrorScreen';

/** Figma 66:89 · P18 Error de pago */
const meta = {
  title: 'Modules/Payment/PaymentError/PaymentErrorScreen',
  component: PaymentErrorScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    methodId: 'pos' as const,
    onBack: fn(),
    onRetry: fn(),
    onChangeMethod: fn(),
  },
} satisfies Meta<typeof PaymentErrorScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
