import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { PaymentReferenceInputCard } from './PaymentReferenceInputCard';
import { PaymentNumericKeypad } from './PaymentNumericKeypad';

const meta = {
  title: 'Modules/Payment/Reference/PaymentReferenceInputCard',
  component: PaymentReferenceInputCard,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
} satisfies Meta<typeof PaymentReferenceInputCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { label: 'Ingresa tu código de referencia', value: '' },
  render: () => (
    <View style={{ padding: 24, width: '100%' }}>
      <PaymentReferenceInputCard label="Ingresa tu código de referencia" value="" />
    </View>
  ),
};

export const PartialDigits: Story = {
  args: { label: 'Ingresa tu código de referencia', value: '123' },
  render: () => (
    <View style={{ padding: 24, width: '100%' }}>
      <PaymentReferenceInputCard label="Ingresa tu código de referencia" value="123" />
    </View>
  ),
};

export const WithKeypad: Story = {
  args: { label: 'Ingresa tu código de referencia', value: '' },
  render: function WithKeypadStory() {
    const [value, setValue] = useState('');
    return (
      <View style={{ padding: 24, gap: 24, width: '100%' }}>
        <PaymentReferenceInputCard label="Ingresa tu código de referencia" value={value} />
        <PaymentNumericKeypad
          onDigit={(d) => value.length < 6 && setValue((v) => v + d)}
          onBackspace={() => setValue((v) => v.slice(0, -1))}
        />
      </View>
    );
  },
};
