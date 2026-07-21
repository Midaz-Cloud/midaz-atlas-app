import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { CustomerPhoneField } from './CustomerPhoneField';

const meta = {
  title: 'Modules/Customer/CustomerPhoneField',
  component: CustomerPhoneField,
  decorators: [withI18nStorybook],
  args: {
    label: 'Teléfono',
    subscriberPlaceholder: 'Ingresa tu número de teléfono',
    operatorCode: '414',
    subscriberNumber: '',
    onOperatorChange: fn(),
    onSubscriberChange: fn(),
  },
} satisfies Meta<typeof CustomerPhoneField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
  args: {
    operatorCode: '412',
    subscriberNumber: '9876543',
  },
};
