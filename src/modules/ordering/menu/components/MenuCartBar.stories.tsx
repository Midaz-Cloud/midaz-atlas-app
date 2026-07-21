import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors } from '@shared/theme';

import { MenuCartBar } from './MenuCartBar';

const meta = {
  title: 'Modules/Ordering/Menu/MenuCartBar',
  component: MenuCartBar,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View style={styles.canvas}>
        <Story />
      </View>
    ),
  ],
  args: {
    itemCount: 0,
    totalUsd: 0,
    onPressCart: fn(),
    onPressNext: fn(),
  },
} satisfies Meta<typeof MenuCartBar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Barra flotante inferior (Figma 35:125–35:144). */
export const Empty: Story = {
  parameters: { locale: 'es' },
};

export const WithItems: Story = {
  parameters: { locale: 'es' },
  args: {
    itemCount: 3,
    totalUsd: 13.5,
  },
};

/** P6 · Your order — muestra Next. */
export const CartWithNext: Story = {
  parameters: { locale: 'es' },
  args: {
    itemCount: 2,
    totalUsd: 9.5,
    showNextButton: true,
  },
};

export const English: Story = {
  parameters: { locale: 'en' },
  args: {
    itemCount: 1,
    totalUsd: 6.5,
  },
};

const styles = {
  canvas: {
    flex: 1,
    minHeight: 320,
    backgroundColor: kioskScreenColors.screenBackground,
    position: 'relative' as const,
  },
};
