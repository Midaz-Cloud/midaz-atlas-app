import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { fn } from 'storybook/test';

import { HeroSelectionCard } from './HeroSelectionCard';
import { kioskScreenColors } from '@shared/theme/kioskScreen';

const meta = {
  title: 'Modules/Introduction/HeroSelectionCard',
  component: HeroSelectionCard,
  decorators: [
    Story => (
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: kioskScreenColors.screenBackground,
        }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: fn(),
  },
} satisfies Meta<typeof HeroSelectionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DineIn: Story = {
  args: {
    label: 'Para comer aquí',
    imageVariant: 'dineIn',
    testID: 'order-type-dine-in',
  },
};

export const TakeOut: Story = {
  args: {
    label: 'Para llevar',
    imageVariant: 'takeOut',
    testID: 'order-type-take-out',
  },
};
