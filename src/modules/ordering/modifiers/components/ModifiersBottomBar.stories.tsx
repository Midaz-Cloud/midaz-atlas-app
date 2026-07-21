import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockToppings } from '../data/mockToppings';
import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { ModifiersBottomBar } from './ModifiersBottomBar';

const meta = {
  title: 'Modules/Ordering/Modifiers/ModifiersBottomBar',
  component: ModifiersBottomBar,
  decorators: [withI18nStorybook, (Story) => modifiersStoryCanvas(<Story />, 320)],
  args: {
    selectedToppings: [mockToppings[0]!, mockToppings[2]!],
    orderSummaryLabel: 'Vaso grande (1/1) · 2 selecciones',
    totalUsd: 5,
    canAdd: true,
    primaryLabel: 'Agregar al carrito',
    onRemoveTopping: fn(),
    onPrimary: fn(),
  },
} satisfies Meta<typeof ModifiersBottomBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
  args: {
    orderSummaryLabel: 'Large cup (1/1) · 2 selections',
  },
};

/** Sin chips: la barra no reserva altura para badges. */
export const EmptySelection: Story = {
  parameters: { locale: 'es' },
  decorators: [withI18nStorybook, (Story) => modifiersStoryCanvas(<Story />, 260)],
  args: {
    selectedToppings: [],
    orderSummaryLabel: 'Vaso grande (1/1) · 0 selecciones',
    canAdd: false,
  },
};
