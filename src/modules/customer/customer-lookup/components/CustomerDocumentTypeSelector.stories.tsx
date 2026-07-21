import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { CustomerDocumentTypeSelector } from './CustomerDocumentTypeSelector';

const meta = {
  title: 'Modules/Customer/CustomerDocumentTypeSelector',
  component: CustomerDocumentTypeSelector,
  decorators: [withI18nStorybook],
  args: {
    value: 'V',
    onChange: fn(),
  },
} satisfies Meta<typeof CustomerDocumentTypeSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const SelectedJ: Story = {
  args: {
    value: 'J',
  },
};
