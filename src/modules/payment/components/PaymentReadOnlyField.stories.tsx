import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenLayout } from '@shared/theme';

import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { PaymentReadOnlyField } from './PaymentReadOnlyField';

/** Figma 48:15–48:32 */
const meta = {
  title: 'Modules/Payment/Mobile/PaymentReadOnlyField',
  component: PaymentReadOnlyField,
  decorators: [
    withI18nStorybook,
    (Story) =>
      paymentFlowStoryCanvas(
        <View style={{ padding: 24 }}>
          <Story />
        </View>,
      ),
  ],
  args: {
    label: 'Banco',
    value: 'Banesco',
  },
} satisfies Meta<typeof PaymentReadOnlyField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bank: Story = {
  parameters: { locale: 'es' },
};

export const Phone: Story = {
  parameters: { locale: 'es' },
  args: { label: 'Teléfono', value: '0412 555 12 34' },
};
