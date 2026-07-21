import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { OrderOutcomeHintRow } from './OrderOutcomeHintRow';

const meta = {
  title: 'Modules/Payment/Outcome/OrderOutcomeHintRow',
  component: OrderOutcomeHintRow,
  decorators: [
    (Story) => paymentFlowStoryCanvas(<View style={{ padding: 24 }}><Story /></View>),
  ],
  args: {
    message:
      'Por favor, toma tu ticket impreso y factura en la ranura inferior del kiosco.',
  },
} satisfies Meta<typeof OrderOutcomeHintRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
