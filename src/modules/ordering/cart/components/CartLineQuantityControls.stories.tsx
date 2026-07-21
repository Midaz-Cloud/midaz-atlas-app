import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { cartStoryCanvas } from './cartStoryDecorators';
import { CartLineQuantityControls } from './CartLineQuantityControls';

function ControlsDemo() {
  const [quantity, setQuantity] = useState(1);
  return (
    <CartLineQuantityControls
      quantity={quantity}
      onDecrement={() => setQuantity((value) => Math.max(1, value - 1))}
      onIncrement={() => setQuantity((value) => value + 1)}
    />
  );
}

const meta = {
  title: 'Modules/Ordering/Cart/CartLineQuantityControls',
  component: CartLineQuantityControls,
  decorators: [(Story) => cartStoryCanvas(<Story />, 140)],
  args: {
    quantity: 1,
    onDecrement: fn(),
    onIncrement: fn(),
  },
} satisfies Meta<typeof CartLineQuantityControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => <ControlsDemo />,
};
