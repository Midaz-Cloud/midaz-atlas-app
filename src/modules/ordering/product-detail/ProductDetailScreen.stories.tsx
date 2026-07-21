import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockMenuProducts } from '../menu/data/mockMenuCatalog';
import { ProductDetailScreen } from './ProductDetailScreen';

const cupLarge = mockMenuProducts.find((product) => product.id === 'cup-large')!;

const meta = {
  title: 'Modules/Ordering/ProductDetail',
  component: ProductDetailScreen,
  decorators: [withI18nStorybook],
  args: {
    product: cupLarge,
    itemCount: 1,
    totalUsd: 5,
    onBack: fn(),
    onCartPress: fn(),
    onPrimaryAction: fn(),
  },
} satisfies Meta<typeof ProductDetailScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithModifiersSpanish: Story = {
  parameters: { locale: 'es' },
};

export const WithModifiersEnglish: Story = {
  parameters: { locale: 'en' },
};

export const AddWithoutModifiers: Story = {
  parameters: { locale: 'es' },
  args: {
    product: mockMenuProducts.find((product) => product.id === 'cup-small')!,
    itemCount: 0,
    totalUsd: 0,
  },
};

export const EmptyCart: Story = {
  parameters: { locale: 'es' },
  args: {
    itemCount: 0,
    totalUsd: 0,
  },
};
