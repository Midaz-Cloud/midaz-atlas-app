import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { ProductDetailCartSummary } from './ProductDetailCartSummary';
import { productDetailStoryCanvas } from './productDetailStoryDecorators';

const meta = {
  title: 'Modules/Ordering/ProductDetail/ProductDetailCartSummary',
  component: ProductDetailCartSummary,
  decorators: [
    withI18nStorybook,
    (Story) => productDetailStoryCanvas(<Story />, 120),
  ],
  args: {
    itemCount: 1,
    totalUsd: 5,
    onPress: fn(),
  },
} satisfies Meta<typeof ProductDetailCartSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Resumen del carrito (Figma 35:187–35:195). */
export const OneItemSpanish: Story = {
  parameters: { locale: 'es' },
};

export const MultipleItemsSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    itemCount: 3,
    totalUsd: 13.5,
    projectedItemCount: 5,
    projectedTotalUsd: 18.5,
  },
};

export const EmptyCartEnglish: Story = {
  parameters: { locale: 'en' },
  args: {
    itemCount: 0,
    totalUsd: 0,
  },
};

export const Static: Story = {
  parameters: { locale: 'es' },
  args: {
    onPress: undefined,
  },
};
