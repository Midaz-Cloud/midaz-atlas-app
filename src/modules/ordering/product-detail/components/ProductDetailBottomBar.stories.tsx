import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { ProductDetailBottomBar } from './ProductDetailBottomBar';
import { productDetailStoryCanvas } from './productDetailStoryDecorators';

const meta = {
  title: 'Modules/Ordering/ProductDetail/ProductDetailBottomBar',
  component: ProductDetailBottomBar,
  decorators: [
    withI18nStorybook,
    (Story) => productDetailStoryCanvas(<Story />, 320),
  ],
  args: {
    itemCount: 1,
    totalUsd: 5,
    primaryLabel: 'Continuar',
    onPressCart: fn(),
    onPressPrimary: fn(),
  },
} satisfies Meta<typeof ProductDetailBottomBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContinueSpanish: Story = {
  parameters: { locale: 'es' },
};

export const AddSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    primaryLabel: 'Agregar',
    itemCount: 0,
    totalUsd: 0,
  },
};

export const WithCartEnglish: Story = {
  parameters: { locale: 'en' },
  args: {
    primaryLabel: 'Next',
    itemCount: 2,
    totalUsd: 10,
    projectedItemCount: 4,
    projectedTotalUsd: 16,
  },
};

export const SoldOut: Story = {
  parameters: { locale: 'es' },
  args: {
    soldOut: true,
  },
};
