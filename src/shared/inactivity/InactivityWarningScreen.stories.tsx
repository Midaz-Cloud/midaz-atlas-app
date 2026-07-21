import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '@modules/payment/components/paymentFlowStoryDecorators';

import { InactivityWarningScreen } from './InactivityWarningScreen';

/** Figma 66:2 · P16 Timeout */
const meta = {
  title: 'Modules/Shared/Inactivity/InactivityWarningScreen',
  component: InactivityWarningScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    secondsRemaining: 30,
    onContinue: fn(),
  },
} satisfies Meta<typeof InactivityWarningScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const CountdownLow: Story = {
  parameters: { locale: 'es' },
  args: { secondsRemaining: 5 },
};
