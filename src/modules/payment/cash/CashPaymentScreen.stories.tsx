import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { CashPaymentScreen } from './CashPaymentScreen';
import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';

const meta = {
  title: 'Modules/Payment/Cash/CashPaymentScreen',
  component: CashPaymentScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    onBack: fn(),
    onSessionComplete: fn(),
  },
} satisfies Meta<typeof CashPaymentScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
