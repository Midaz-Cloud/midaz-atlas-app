import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors } from '@shared/theme';

import { mockMenuProducts } from '../data/mockMenuCatalog';

import { MenuFeaturedSection } from './MenuFeaturedSection';

const featuredProducts = mockMenuProducts.filter((p) => p.featured);

const meta = {
  title: 'Modules/Ordering/Menu/MenuFeaturedSection',
  component: MenuFeaturedSection,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View style={{ flex: 1, backgroundColor: kioskScreenColors.screenBackground }}>
        <Story />
      </View>
    ),
  ],
  args: {
    products: featuredProducts,
    onProductPress: fn(),
    onAddProduct: fn(),
  },
} satisfies Meta<typeof MenuFeaturedSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const SingleItem: Story = {
  parameters: { locale: 'es' },
  args: {
    products: featuredProducts.slice(0, 1),
  },
};
