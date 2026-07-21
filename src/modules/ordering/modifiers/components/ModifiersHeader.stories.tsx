import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { modifiersStoryCanvas } from './modifiersStoryDecorators';
import { ModifiersHeader } from './ModifiersHeader';

const meta = {
  title: 'Modules/Ordering/Modifiers/ModifiersHeader',
  component: ModifiersHeader,
  decorators: [withI18nStorybook, (Story) => modifiersStoryCanvas(<Story />, 280)],
  args: {
    title: 'Elige complementos',
    subtitle: 'Elige hasta 4 complementos completamente gratis.',
  },
} satisfies Meta<typeof ModifiersHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
  args: {
    title: 'Choose add-ons',
    subtitle: 'Choose up to 4 add-ons completely free.',
  },
};
