import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import IconCheckCircle from '@assets/images/payment/outcome/icon-check-circle.svg';

import { paymentFlowStoryCanvas } from '../../components/paymentFlowStoryDecorators';
import { OrderOutcomeSummaryBanner } from './OrderOutcomeSummaryBanner';

const iconSize = kioskScreenLayout.paymentOutcomeQrBannerIconSize;

const meta = {
  title: 'Modules/Payment/Outcome/OrderOutcomeSummaryBanner',
  component: OrderOutcomeSummaryBanner,
  decorators: [
    (Story) =>
      paymentFlowStoryCanvas(
        <View style={{ padding: 24, alignSelf: 'stretch' }}>
          <Story />
        </View>,
      ),
  ],
  args: {
    orderId: 'K-000492',
    orderPrefix: 'Orden',
    totalAmount: 5.35,
    currencyCode: 'USD',
    paymentCompletedLabel: 'Pago completado exitosamente',
    paymentStatusIcon: <IconCheckCircle width={iconSize} height={iconSize} />,
  },
} satisfies Meta<typeof OrderOutcomeSummaryBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const VesPrimary: Story = {
  args: {
    totalAmount: 310,
    currencyCode: 'VES',
  },
};