import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { PaymentMethodScreen } from './PaymentMethodScreen';

/** Figma 43:155 */
const meta = {
  title: 'Modules/Payment/PaymentMethodScreen',
  component: PaymentMethodScreen,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <KioskOrderProvider>
        <Story />
      </KioskOrderProvider>
    ),
  ],
  args: {
    onBack: fn(),
    onSelectMethod: fn(),
  },
} satisfies Meta<typeof PaymentMethodScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
