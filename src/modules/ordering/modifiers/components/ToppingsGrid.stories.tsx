import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { getToppingsForGroup } from '../data/mockToppings';
import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { ToppingsGrid } from './ToppingsGrid';

function ToppingsGridDemo() {
  const toppings = getToppingsForGroup('cup-large-toppings');
  const [quantities, setQuantities] = useState<Record<string, number>>({ oreo: 1, gomitas: 1 });
  const max = 4;
  const slotsUsed = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <ToppingsGrid
      toppings={toppings}
      getQuantity={(id: string) => quantities[id] ?? 0}
      canSelectMore={slotsUsed < max}
      maxSelections={max}
      slotsUsed={slotsUsed}
      onIncrement={(id: string) =>
        setQuantities((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
      }
      onDecrement={(id: string) =>
        setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }))
      }
    />
  );
}

const meta = {
  title: 'Modules/Ordering/Modifiers/ToppingsGrid',
  component: ToppingsGrid,
  decorators: [withI18nStorybook, (Story) => modifiersStoryCanvas(<Story />, 1600)],
  args: {
    toppings: [],
    getQuantity: () => 0,
    canSelectMore: true,
    maxSelections: 4,
    slotsUsed: 0,
    onIncrement: () => {},
    onDecrement: () => {},
  },
} satisfies Meta<typeof ToppingsGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractiveSpanish: Story = {
  parameters: { locale: 'es' },
  render: () => <ToppingsGridDemo />,
};
