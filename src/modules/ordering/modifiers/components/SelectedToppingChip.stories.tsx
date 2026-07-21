import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockToppings } from '../data/mockToppings';
import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { SelectedToppingChip } from './SelectedToppingChip';

const meta = {
  title: 'Modules/Ordering/Modifiers/SelectedToppingChip',
  component: SelectedToppingChip,
  decorators: [withI18nStorybook, (Story) => modifiersStoryCanvas(<Story />, 100)],
  args: {
    topping: mockToppings[0]!,
    onRemove: fn(),
  },
} satisfies Meta<typeof SelectedToppingChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
  args: { topping: mockToppings[2]! },
};
