import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../payment/components/paymentFlowStoryDecorators';
import { LocatorEntryScreen } from './LocatorEntryScreen';

const meta = {
  title: 'Modules/Locator/LocatorEntryScreen',
  component: LocatorEntryScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    locatorCode: '',
    onBack: fn(),
    onLocatorCodeChange: fn(),
    onValidate: fn(),
  },
} satisfies Meta<typeof LocatorEntryScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const WithDigits: Story = {
  args: { locatorCode: '12' },
};
