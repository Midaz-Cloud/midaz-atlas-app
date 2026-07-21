import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { fn } from 'storybook/test';

import { kioskScreenColors } from '@shared/theme/kioskScreen';

import { BackButton } from './BackButton';

const meta = {
  title: 'Shared/BackButton',
  component: BackButton,
  decorators: [
    Story => (
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: kioskScreenColors.screenBackground,
        }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: fn(),
  },
} satisfies Meta<typeof BackButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
