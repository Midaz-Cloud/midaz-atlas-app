import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { OrderNumberCard } from './OrderNumberCard';

const meta = {
  title: 'Modules/Payment/Outcome/OrderNumberCard',
  component: OrderNumberCard,
  decorators: [
    withI18nStorybook,
    (Story) => paymentFlowStoryCanvas(<View style={{ padding: 24 }}><Story /></View>),
  ],
  args: {
    orderId: 'K-000023',
    label: 'Tu número de pedido',
  },
} satisfies Meta<typeof OrderNumberCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
