import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ScrollView, View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors, kioskScreenLayout } from '@shared/theme';

import { mockMenuProducts } from '../data/mockMenuCatalog';

import { ProductCard } from './ProductCard';

const meta = {
  title: 'Modules/Ordering/Menu/ProductCard',
  component: ProductCard,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <ScrollView
        style={{ flex: 1, backgroundColor: kioskScreenColors.screenBackground }}
        contentContainerStyle={styles.storyScroll}>
        <View style={styles.cardSlot}>
          <Story />
        </View>
      </ScrollView>
    ),
  ],
  args: {
    onPress: fn(),
    onAddPress: fn(),
  },
} satisfies Meta<typeof ProductCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    product: mockMenuProducts.find((p) => p.id === 'cup-small')!,
  },
};

export const Popular: Story = {
  args: {
    product: mockMenuProducts.find((p) => p.id === 'cup-medium')!,
  },
};

/** Círculo sólido + badge de cantidad (producto en carrito). */
export const InCart: Story = {
  args: {
    product: mockMenuProducts.find((p) => p.id === 'cup-small')!,
    cartQuantity: 2,
  },
};

const styles = {
  storyScroll: {
    flexGrow: 1,
    padding: kioskScreenLayout.menuHorizontalPadding,
    alignItems: 'center' as const,
  },
  cardSlot: {
    width: kioskScreenLayout.productGridColumnWidth,
  },
};
