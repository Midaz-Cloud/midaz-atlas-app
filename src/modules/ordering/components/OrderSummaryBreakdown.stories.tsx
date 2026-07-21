import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { cartStoryCanvas } from '../cart/components/cartStoryDecorators';
import { defaultOrderFiscalConfig } from '@shared/kiosk-order/mockOrderFiscalConfig';

import { mockOrderTotals, mockOrderTotalsWithIgtf } from '../cart/data/mockOrderTotals';
import { OrderSummaryBreakdown } from './OrderSummaryBreakdown';

const meta = {
  title: 'Modules/Ordering/OrderSummaryBreakdown',
  component: OrderSummaryBreakdown,
  decorators: [
    withI18nStorybook,
    (Story) => cartStoryCanvas(<Story />, 360),
  ],
  args: {
    totals: mockOrderTotals,
    showIgtf: false,
    bcvRate: defaultOrderFiscalConfig.usdToVesRate,
  },
} satisfies Meta<typeof OrderSummaryBreakdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const WithIgtf: Story = {
  parameters: { locale: 'es' },
  args: {
    totals: mockOrderTotalsWithIgtf,
    showIgtf: true,
  },
};
