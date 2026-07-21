import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskQuantityStepper } from './KioskQuantityStepper';

const meta = {
  title: 'Shared/KioskQuantityStepper',
  component: KioskQuantityStepper,
  args: {
    value: 1,
    min: 0,
    max: 5,
    onDecrement: fn(),
    onIncrement: fn(),
  },
} satisfies Meta<typeof KioskQuantityStepper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProductDetail: Story = {
  args: {
    variant: 'productDetail',
    min: 1,
  },
};

export const ModifierCard: Story = {
  args: {
    variant: 'modifierCard',
    value: 2,
  },
};
