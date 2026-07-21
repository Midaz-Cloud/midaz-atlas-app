import type { Meta, StoryObj } from '@storybook/react-native';
import { useEffect, type ReactNode } from 'react';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { KioskOrderProvider, useKioskOrder } from '@shared/kiosk-order';

import { mockMenuProducts } from './data/mockMenuCatalog';
import { MenuScreen } from './MenuScreen';

function SeedMenuCart({ children }: { children: ReactNode }) {
  const { addProduct, lines } = useKioskOrder();

  useEffect(() => {
    if (lines.length > 0) {
      return;
    }
    const product = mockMenuProducts.find((p) => p.id === 'cup-small');
    if (product) {
      addProduct(product.id, product.unitPrice, 1);
    }
  }, [addProduct, lines.length]);

  return children;
}

const meta = {
  title: 'Modules/Ordering/Menu',
  component: MenuScreen,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <KioskOrderProvider>
        <Story />
      </KioskOrderProvider>
    ),
  ],
  args: {
    itemCount: 0,
    totalUsd: 0,
    onBack: fn(),
    onProductPress: fn(),
    onAddProduct: fn(),
    onCartPress: fn(),
    onCartNext: fn(),
  },
} satisfies Meta<typeof MenuScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const WithItemsInCart: Story = {
  parameters: { locale: 'es' },
  decorators: [
    (Story) => (
      <SeedMenuCart>
        <Story />
      </SeedMenuCart>
    ),
  ],
  args: {
    itemCount: 1,
    totalUsd: 3,
  },
};
