import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { mockMenuProducts } from '../menu/data/mockMenuCatalog';
import { getGroupForFlow } from './data/mockModifierFlows';
import { ModifiersScreen } from './ModifiersScreen';

const cupLarge = mockMenuProducts.find((product) => product.id === 'cup-large')!;
const yogurt = mockMenuProducts.find((product) => product.id === 'yogurt-custom')!;
const cupLargeGroup = getGroupForFlow('cup-large-flow', 0)!;
const yogurtSiropeGroup = getGroupForFlow('yogurt-flow', 1)!;

const meta = {
  title: 'Modules/Ordering/Modifiers',
  component: ModifiersScreen,
  decorators: [withI18nStorybook],
  args: {
    productQuantity: 1,
    unitIndex: 0,
    groupIndex: 0,
    groupCount: 1,
    isLastStep: true,
    onBack: fn(),
    onPrimary: fn(),
  },
} satisfies Meta<typeof ModifiersScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CupLargeToppings: Story = {
  parameters: { locale: 'es' },
  args: {
    product: cupLarge,
    group: cupLargeGroup,
    groupIndex: 0,
    groupCount: 1,
    isLastStep: true,
  },
};

export const CupLargeTwoUnitsFirstGroup: Story = {
  parameters: { locale: 'es' },
  args: {
    product: cupLarge,
    group: cupLargeGroup,
    groupIndex: 0,
    groupCount: 1,
    productQuantity: 2,
    unitIndex: 0,
    isLastStep: false,
  },
};

export const CupLargeTwoUnitsSecondGroup: Story = {
  parameters: { locale: 'es' },
  args: {
    product: cupLarge,
    group: cupLargeGroup,
    groupIndex: 0,
    groupCount: 1,
    productQuantity: 2,
    unitIndex: 1,
    isLastStep: true,
  },
};

export const YogurtSiropeStep: Story = {
  parameters: { locale: 'es' },
  args: {
    product: yogurt,
    group: yogurtSiropeGroup,
    groupIndex: 1,
    groupCount: 3,
    isLastStep: false,
    initialGroupSelection: {
      groupId: yogurtSiropeGroup.id,
      options: [{ optionId: 'sirope-fresa', quantity: 1 }],
    },
  },
};

export const English: Story = {
  parameters: { locale: 'en' },
  args: {
    product: cupLarge,
    group: cupLargeGroup,
    groupIndex: 0,
    groupCount: 1,
    isLastStep: true,
  },
};
