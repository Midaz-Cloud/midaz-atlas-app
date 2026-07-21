import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors, kioskScreenLayout } from '@shared/theme';

import { mockMenuProducts } from '../data/mockMenuCatalog';

import { FeaturedProductCard } from './FeaturedProductCard';

const meta = {
  title: 'Modules/Ordering/Menu/FeaturedProductCard',
  component: FeaturedProductCard,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View
        style={{
          flex: 1,
          padding: kioskScreenLayout.menuHorizontalPadding,
          backgroundColor: kioskScreenColors.screenBackground,
        }}>
        <View style={{ width: kioskScreenLayout.featuredCarouselCardWidth }}>
          <Story />
        </View>
      </View>
    ),
  ],
  args: {
    onPress: fn(),
    onAddPress: fn(),
  },
} satisfies Meta<typeof FeaturedProductCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewBadge: Story = {
  parameters: { locale: 'es' },
  args: {
    product: mockMenuProducts.find((p) => p.id === 'mega-sundae-mix')!,
  },
};

export const PopularBadge: Story = {
  parameters: { locale: 'es' },
  args: {
    product: mockMenuProducts.find((p) => p.id === 'featured-cup-large')!,
  },
};

export const InCart: Story = {
  parameters: { locale: 'es' },
  args: {
    product: mockMenuProducts.find((p) => p.id === 'featured-cup-large')!,
    cartQuantity: 3,
  },
};
