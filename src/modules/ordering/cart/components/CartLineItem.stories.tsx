import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { useCartScreen } from '../hooks/useCartScreen';
import { mockCartLines } from '../data/mockCartLines';
import { cartStoryCanvas } from './cartStoryDecorators';
import { CartLineItem } from './CartLineItem';

function CartLineItemFromMock() {
  const { cartLines } = useCartScreen(mockCartLines);
  const line = cartLines[0]!;
  return (
    <CartLineItem
      line={line}
      onIncrement={fn()}
      onDecrement={fn()}
      onRemove={fn()}
    />
  );
}

const meta = {
  title: 'Modules/Ordering/Cart/CartLineItem',
  component: CartLineItem,
  decorators: [withI18nStorybook, (Story) => cartStoryCanvas(<Story />, 420)],
  args: {
    onIncrement: fn(),
    onDecrement: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof CartLineItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithToppingsSpanish: Story = {
  parameters: { locale: 'es' },
  render: () => <CartLineItemFromMock />,
};
