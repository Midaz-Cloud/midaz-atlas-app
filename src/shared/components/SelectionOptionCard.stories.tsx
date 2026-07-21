import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { fn } from 'storybook/test';

import { kioskScreenColors } from '@shared/theme/kioskScreen';

import { SelectionOptionCard } from './SelectionOptionCard';

const meta = {
  title: 'Shared/SelectionOptionCard',
  component: SelectionOptionCard,
  decorators: [
    Story => (
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          backgroundColor: kioskScreenColors.screenBackground,
        }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: fn(),
  },
} satisfies Meta<typeof SelectionOptionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Featured: Story = {
  args: {
    variant: 'featured',
    label: 'Español',
    description: 'Continuar en Español',
    leadingBackgroundColor: '#fff7ed',
    testID: 'selection-option-featured',
  },
};

export const Compact: Story = {
  args: {
    variant: 'compact',
    label: 'Opción simple',
    hint: 'Texto secundario',
    testID: 'selection-option-compact',
  },
};
