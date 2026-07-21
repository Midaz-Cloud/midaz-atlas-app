import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenLayout } from '@shared/theme';

import { PaymentMobileDetails } from './PaymentMobileDetails';
import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';

/** Figma 48:13 */
const meta = {
  title: 'Modules/Payment/Mobile/PaymentMobileDetails',
  component: PaymentMobileDetails,
  decorators: [
    withI18nStorybook,
    (Story) =>
      paymentFlowStoryCanvas(
        <View
          style={{
            paddingHorizontal: kioskScreenLayout.paymentPosContentPaddingHorizontal,
            paddingTop: 24,
          }}>
          <Story />
        </View>,
      ),
  ],
  args: {
    bankLabel: 'Banco',
    bank: 'Banco Activo (0171)',
    phoneLabel: 'Teléfono',
    phone: '04142251008',
    rifLabel: 'C.I./RIF',
    rif: 'J412438905',
    holderLabel: 'Titular',
    holder: 'COCHI CRUNCH C.A.',
  },
} satisfies Meta<typeof PaymentMobileDetails>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};
