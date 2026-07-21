import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { ProductDetailQuantityRow } from './ProductDetailQuantityRow';
import { productDetailStoryCanvas } from './productDetailStoryDecorators';

function QuantityRowDemo() {
  const [quantity, setQuantity] = useState(1);
  return (
    <ProductDetailQuantityRow
      quantity={quantity}
      onDecrement={() => setQuantity((current) => Math.max(1, current - 1))}
      onIncrement={() => setQuantity((current) => Math.min(99, current + 1))}
    />
  );
}

const meta = {
  title: 'Modules/Ordering/ProductDetail/ProductDetailQuantityRow',
  component: ProductDetailQuantityRow,
  decorators: [
    withI18nStorybook,
    (Story) => productDetailStoryCanvas(<Story />, 220),
  ],
  args: {
    quantity: 1,
    onDecrement: fn(),
    onIncrement: fn(),
  },
} satisfies Meta<typeof ProductDetailQuantityRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Fila completa Cantidad + controles (Figma 35:172). */
export const InteractiveSpanish: Story = {
  parameters: { locale: 'es' },
  render: () => <QuantityRowDemo />,
};

export const English: Story = {
  parameters: { locale: 'en' },
  render: () => <QuantityRowDemo />,
};
