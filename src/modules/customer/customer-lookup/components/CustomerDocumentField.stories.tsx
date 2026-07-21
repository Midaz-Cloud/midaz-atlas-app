import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { CustomerDocumentField } from './CustomerDocumentField';

const meta = {
  title: 'Modules/Customer/CustomerDocumentField',
  component: CustomerDocumentField,
  decorators: [withI18nStorybook],
  args: {
    label: 'Número de cédula',
    documentType: 'V',
    documentNumber: '',
    onTypeChange: fn(),
  },
} satisfies Meta<typeof CustomerDocumentField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithNumber: Story = {
  args: {
    documentNumber: '12345678',
  },
};

export const Juridico: Story = {
  args: {
    documentType: 'J',
    documentNumber: '401234567',
  },
};
