import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { ModifierUnitPagination } from './ModifierUnitPagination';

const meta = {
  title: 'Modules/Ordering/Modifiers/ModifierUnitPagination',
  component: ModifierUnitPagination,
  decorators: [withI18nStorybook],
  args: {
    currentUnit: 1,
    totalUnits: 2,
    productName: 'Vaso grande',
  },
} satisfies Meta<typeof ModifierUnitPagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstUnit: Story = {
  parameters: { locale: 'es' },
};

export const SecondUnit: Story = {
  parameters: { locale: 'es' },
  args: {
    currentUnit: 2,
  },
};

export const HiddenWhenSingleUnit: Story = {
  parameters: { locale: 'es' },
  args: {
    totalUnits: 1,
  },
};
