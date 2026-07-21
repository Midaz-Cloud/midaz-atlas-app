import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { withKioskCustomerProvider } from '../customerStoryDecorators';
import { CustomerLookupScreen } from './CustomerLookupScreen';

const meta = {
  title: 'Modules/Customer/CustomerLookupScreen',
  component: CustomerLookupScreen,
  decorators: [withI18nStorybook, withKioskCustomerProvider],
  args: {
    onBack: fn(),
    onCustomerReady: fn(),
    onRegisterRequired: fn(),
  },
} satisfies Meta<typeof CustomerLookupScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const WithInitialDocument: Story = {
  parameters: { locale: 'es' },
  args: {
    initialDocumentId: 'V12345',
  },
};
