import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { kioskScreenColors } from '@shared/theme/kioskScreen';

import { KioskStepHeader } from './KioskStepHeader';

const meta = {
  title: 'Shared/KioskStepHeader',
  component: KioskStepHeader,
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
} satisfies Meta<typeof KioskStepHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LanguageStep: Story = {
  args: {
    title: 'Select Language',
    subtitle: 'Elige tu idioma / Choose your language',
  },
};

export const OrderTypeStep: Story = {
  args: {
    title: '¿Cómo quieres tu pedido?',
    subtitle: 'Selecciona tu preferencia',
  },
};
