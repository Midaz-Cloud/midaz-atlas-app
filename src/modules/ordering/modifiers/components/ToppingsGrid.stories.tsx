import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { getToppingsForGroup } from '../data/mockToppings';
import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { ToppingsGrid } from './ToppingsGrid';

function ToppingsGridDemo() {
  const toppings = getToppingsForGroup('cup-large-toppings');
  const [selectedIds, setSelectedIds] = useState<string[]>(['oreo', 'gomitas']);
  const max = 4;

  return (
    <ToppingsGrid
      toppings={toppings}
      isSelected={(id) => selectedIds.includes(id)}
      canSelectMore={selectedIds.length < max}
      onToggle={(id) => {
        setSelectedIds((current) => {
          if (current.includes(id)) {
            return current.filter((item) => item !== id);
          }
          if (current.length >= max) {
            return current;
          }
          return [...current, id];
        });
      }}
    />
  );
}

const meta = {
  title: 'Modules/Ordering/Modifiers/ToppingsGrid',
  component: ToppingsGrid,
  decorators: [withI18nStorybook, (Story) => modifiersStoryCanvas(<Story />, 1600)],
} satisfies Meta<typeof ToppingsGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractiveSpanish: Story = {
  parameters: { locale: 'es' },
  render: () => <ToppingsGridDemo />,
};
