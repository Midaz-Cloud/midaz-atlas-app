import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { ProductDetailQuantityControls } from './ProductDetailQuantityControls';
import { productDetailStoryCanvas } from './productDetailStoryDecorators';

function QuantityControlsDemo(
  props: Omit<
    ComponentProps<typeof ProductDetailQuantityControls>,
    'value' | 'onDecrement' | 'onIncrement'
  >,
) {
  const [value, setValue] = useState(1);
  return (
    <ProductDetailQuantityControls
      {...props}
      value={value}
      onDecrement={() => setValue((current) => Math.max(1, current - 1))}
      onIncrement={() => setValue((current) => Math.min(99, current + 1))}
    />
  );
}

const meta = {
  title: 'Modules/Ordering/ProductDetail/ProductDetailQuantityControls',
  component: ProductDetailQuantityControls,
  decorators: [(Story) => productDetailStoryCanvas(<Story />)],
  args: {
    value: 1,
    onDecrement: fn(),
    onIncrement: fn(),
  },
} satisfies Meta<typeof ProductDetailQuantityControls>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Controles +/- (Figma 35:175–35:184). */
export const Interactive: Story = {
  render: () => <QuantityControlsDemo />,
};

export const AtMinimum: Story = {
  args: {
    value: 1,
  },
};

export const HighQuantity: Story = {
  args: {
    value: 12,
  },
};
