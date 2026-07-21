import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { cartStoryCanvas } from './cartStoryDecorators';
import { CartAddMoreButton } from './CartAddMoreButton';

const meta = {
  title: 'Modules/Ordering/Cart/CartAddMoreButton',
  component: CartAddMoreButton,
  decorators: [withI18nStorybook, (Story) => cartStoryCanvas(<Story />, 160)],
  args: {
    onPress: fn(),
  },
} satisfies Meta<typeof CartAddMoreButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
