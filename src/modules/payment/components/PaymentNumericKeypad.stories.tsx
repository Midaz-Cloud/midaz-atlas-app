import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { View } from 'react-native';

import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { PaymentNumericKeypad } from './PaymentNumericKeypad';

const meta = {
  title: 'Modules/Payment/Reference/PaymentNumericKeypad',
  component: PaymentNumericKeypad,
  decorators: [(Story) => paymentFlowStoryCanvas(<View style={{ padding: 24 }}><Story /></View>)],
  args: {
    onDigit: fn(),
    onBackspace: fn(),
  },
} satisfies Meta<typeof PaymentNumericKeypad>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AccentBackspace: Story = {
  args: {
    accentBackspace: true,
  },
};
