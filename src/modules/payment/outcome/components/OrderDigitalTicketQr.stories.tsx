import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { paymentFlowStoryCanvas } from '../../components/paymentFlowStoryDecorators';
import { OrderDigitalTicketQr } from './OrderDigitalTicketQr';

const meta = {
  title: 'Modules/Payment/Outcome/OrderDigitalTicketQr',
  component: OrderDigitalTicketQr,
  decorators: [
    (Story) =>
      paymentFlowStoryCanvas(
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Story />
        </View>,
      ),
  ],
  args: {
    orderId: 'K-000492',
  },
} satisfies Meta<typeof OrderDigitalTicketQr>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
