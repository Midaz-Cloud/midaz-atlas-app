import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors } from '@shared/theme';

import { mockMenuCategories } from '../data/mockMenuCatalog';

import { MenuCategoryTabs } from './MenuCategoryTabs';

function MenuCategoryTabsInteractive() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    mockMenuCategories[0]?.id ?? 'cones',
  );

  return (
    <MenuCategoryTabs
      categories={mockMenuCategories}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={setSelectedCategoryId}
    />
  );
}

const meta = {
  title: 'Modules/Ordering/Menu/MenuCategoryTabs',
  component: MenuCategoryTabs,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View style={{ flex: 1, backgroundColor: kioskScreenColors.screenBackground }}>
        <Story />
      </View>
    ),
  ],
  args: {
    categories: mockMenuCategories,
    selectedCategoryId: 'cones',
    onSelectCategory: fn(),
  },
} satisfies Meta<typeof MenuCategoryTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Slider horizontal de categorías (P4 · Figma 35:4). */
export const Spanish: Story = {
  parameters: { locale: 'es' },
  render: () => <MenuCategoryTabsInteractive />,
};

export const English: Story = {
  parameters: { locale: 'en' },
  render: () => <MenuCategoryTabsInteractive />,
};

export const SundaeSelected: Story = {
  parameters: { locale: 'es' },
  args: {
    selectedCategoryId: 'sundae',
  },
  render: (args) => (
    <MenuCategoryTabs
      categories={args.categories}
      selectedCategoryId={args.selectedCategoryId}
      onSelectCategory={args.onSelectCategory}
    />
  ),
};
