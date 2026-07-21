import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenLayout } from '@shared/theme';

import { PaymentAccountDetailsPanel } from './PaymentAccountDetailsPanel';
import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';

const meta = {
  title: 'Modules/Payment/Flow/PaymentAccountDetailsPanel',
  component: PaymentAccountDetailsPanel,
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
} satisfies Meta<typeof PaymentAccountDetailsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MobileSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    testID: 'payment-mobile-details',
    fields: [
      { label: 'Banco', value: 'Banesco', testID: 'payment-mobile-bank' },
      { label: 'Teléfono', value: '0412 555 12 34', testID: 'payment-mobile-phone' },
      { label: 'RIF', value: 'J-12345678-0', testID: 'payment-mobile-rif' },
    ],
  },
};

export const ZelleSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    testID: 'payment-zelle-details',
    fields: [
      {
        label: 'Nombre del titular',
        value: 'Pagos negocio',
        testID: 'payment-zelle-holder',
        fullWidth: true,
      },
      {
        label: 'Correo de destino',
        value: 'pagos@negocio.com',
        testID: 'payment-zelle-email',
        tallValue: true,
        fullWidth: true,
      },
      { label: 'Teléfono', value: '0412 555 12 34', testID: 'payment-zelle-phone' },
    ],
  },
};
