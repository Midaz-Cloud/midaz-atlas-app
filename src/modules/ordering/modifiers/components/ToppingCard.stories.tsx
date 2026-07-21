import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockToppings } from '../data/mockToppings';
import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { ToppingCard } from './ToppingCard';

const oreo = mockToppings[0]!;
const brownie = mockToppings.find((t) => t.id === 'brownie')!;

const meta = {
  title: 'Modules/Ordering/Modifiers/ToppingCard',
  component: ToppingCard,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View style={{ padding: 24, flex: 1 }}>
        <View style={{ width: 460 }}>{modifiersStoryCanvas(<Story />, 520)}</View>
      </View>
    ),
  ],
  args: {
    quantity: 0,
    maxQuantity: 2,
    canIncrement: true,
    onIncrement: fn(),
    onDecrement: fn(),
  },
} satisfies Meta<typeof ToppingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UnselectedSpanish: Story = {
  parameters: { locale: 'es' },
  args: { topping: oreo },
};

export const SelectedSpanish: Story = {
  parameters: { locale: 'es' },
  args: { topping: oreo, quantity: 2, maxQuantity: 2, canIncrement: false },
};

export const WithoutImage: Story = {
  parameters: { locale: 'es' },
  args: { topping: brownie, quantity: 1 },
};

export const AtMaxSlots: Story = {
  parameters: { locale: 'es' },
  args: { topping: oreo, quantity: 2, maxQuantity: 2, canIncrement: false },
};
