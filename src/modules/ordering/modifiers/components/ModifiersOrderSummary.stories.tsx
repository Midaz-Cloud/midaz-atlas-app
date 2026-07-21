import type { Meta, StoryObj } from '@storybook/react-native';

import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { ModifiersOrderSummary } from './ModifiersOrderSummary';

const meta = {
  title: 'Modules/Ordering/Modifiers/ModifiersOrderSummary',
  component: ModifiersOrderSummary,
  decorators: [(Story) => modifiersStoryCanvas(<Story />, 100)],
  args: {
    label: 'Vaso grande (1/1) · 2 selecciones',
    totalUsd: 5,
  },
} satisfies Meta<typeof ModifiersOrderSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoToppings: Story = {
  args: {
    label: 'Vaso grande (1/1) · 0 selecciones',
    totalUsd: 5,
  },
};
