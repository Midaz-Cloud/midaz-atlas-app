import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockOrderTotals } from '../data/mockOrderTotals';
import { cartCheckoutSheetStoryCanvas } from './cartStoryDecorators';
import { CartCheckoutSheet } from './CartCheckoutSheet';

/** Figma 41:92 — resumen de montos sobre carrito. */
const meta = {
  title: 'Modules/Ordering/Cart/CartCheckoutSheet',
  component: CartCheckoutSheet,
  decorators: [
    withI18nStorybook,
    (Story) => cartCheckoutSheetStoryCanvas(<Story />),
  ],
  args: {
    totals: mockOrderTotals,
    onPressPrimary: fn(),
  },
} satisfies Meta<typeof CartCheckoutSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
