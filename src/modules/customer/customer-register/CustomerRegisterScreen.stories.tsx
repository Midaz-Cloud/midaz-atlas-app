import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { withKioskCustomerProvider } from '../customerStoryDecorators';
import { CustomerRegisterScreen } from './CustomerRegisterScreen';

const meta = {
  title: 'Modules/Customer/CustomerRegisterScreen',
  component: CustomerRegisterScreen,
  decorators: [withI18nStorybook, withKioskCustomerProvider],
  args: {
    documentId: 'V87654321',
    onBack: fn(),
    onCustomerReady: fn(),
  },
} satisfies Meta<typeof CustomerRegisterScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const JuridicoSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    documentId: 'J123456784',
  },
};
