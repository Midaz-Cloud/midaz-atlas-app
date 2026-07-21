import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockToppings } from '../data/mockToppings';
import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { SelectedToppingsChips } from './SelectedToppingsChips';

const meta = {
  title: 'Modules/Ordering/Modifiers/SelectedToppingsChips',
  component: SelectedToppingsChips,
  decorators: [withI18nStorybook, (Story) => modifiersStoryCanvas(<Story />, 120)],
  args: {
    onRemove: fn(),
  },
} satisfies Meta<typeof SelectedToppingsChips>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithSelections: Story = {
  parameters: { locale: 'es' },
  args: {
    toppings: [mockToppings[0]!, mockToppings[2]!],
  },
};
