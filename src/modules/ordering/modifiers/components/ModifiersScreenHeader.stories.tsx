import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { ModifiersScreenHeader } from './ModifiersScreenHeader';

const meta = {
  title: 'Modules/Ordering/Modifiers/ModifiersScreenHeader',
  component: ModifiersScreenHeader,
  decorators: [(Story) => modifiersStoryCanvas(<Story />, 160)],
  args: {
    paddingTop: 24,
    onBack: fn(),
  },
} satisfies Meta<typeof ModifiersScreenHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
