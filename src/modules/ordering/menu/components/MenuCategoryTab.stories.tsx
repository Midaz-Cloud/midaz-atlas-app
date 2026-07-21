import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenColors } from '@shared/theme';

import { mockMenuCategories } from '../data/mockMenuCatalog';

import { MenuCategoryTab } from './MenuCategoryTab';

const cones = mockMenuCategories.find((c) => c.id === 'cones')!;
const sundae = mockMenuCategories.find((c) => c.id === 'sundae')!;

const meta = {
  title: 'Modules/Ordering/Menu/MenuCategoryTab',
  component: MenuCategoryTab,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: kioskScreenColors.screenBackground,
          alignItems: 'flex-start',
        }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: fn(),
  },
} satisfies Meta<typeof MenuCategoryTab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Selected: Story = {
  parameters: { locale: 'es' },
  args: {
    category: cones,
    selected: true,
  },
};

export const Default: Story = {
  parameters: { locale: 'es' },
  args: {
    category: sundae,
    selected: false,
  },
};
