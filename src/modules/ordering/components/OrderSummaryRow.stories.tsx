import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { cartStoryCanvas } from '../cart/components/cartStoryDecorators';
import { OrderSummaryRow } from './OrderSummaryRow';

const meta = {
  title: 'Modules/Ordering/OrderSummaryRow',
  component: OrderSummaryRow,
  decorators: [
    withI18nStorybook,
    (Story) => cartStoryCanvas(<Story />, 120),
  ],
  args: {
    label: 'Subtotal',
    value: 'USD 9.00',
  },
} satisfies Meta<typeof OrderSummaryRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Total: Story = {
  args: {
    label: 'Total',
    value: 'USD 10.44',
    variant: 'total',
  },
};
