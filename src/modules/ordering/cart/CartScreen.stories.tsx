import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockCartLines } from './data/mockCartLines';
import { CartScreen } from './CartScreen';

/** P7 editing (Figma 41:2 base) · P8 checkout open (Figma 41:92). */
const meta = {
  title: 'Modules/Ordering/Cart',
  component: CartScreen,
  decorators: [withI18nStorybook],
  args: {
    lines: mockCartLines,
    itemCount: 2,
    totalUsd: 9,
    onBack: fn(),
    onAddMore: fn(),
    onIncrementLine: fn(),
    onDecrementLine: fn(),
    onRemoveLine: fn(),
    onPressNext: fn(),
    onPressCheckoutPrimary: fn(),
  },
} satisfies Meta<typeof CartScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const Empty: Story = {
  parameters: { locale: 'es' },
  args: {
    lines: [],
    itemCount: 0,
    totalUsd: 0,
  },
};

/** Figma 41:92 — sheet de pago, sin barra flotante ni “Agregar más”. */
export const CheckoutOpenSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    initialCheckoutOpen: true,
  },
};

export const CheckoutOpenEnglish: Story = {
  parameters: { locale: 'en' },
  args: {
    initialCheckoutOpen: true,
  },
};
