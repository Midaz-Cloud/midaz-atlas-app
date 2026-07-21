import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { MobilePaymentAccountScreen } from './MobilePaymentAccountScreen';

/** Figma 48:2 · P10 (b) Pago móvil y QR */
const meta = {
  title: 'Modules/Payment/Mobile/MobilePaymentAccountScreen',
  component: MobilePaymentAccountScreen,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <KioskOrderProvider>{paymentFlowStoryCanvas(<Story />)}</KioskOrderProvider>
    ),
  ],
  args: {
    onBack: fn(),
    onContinue: fn(),
  },
} satisfies Meta<typeof MobilePaymentAccountScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
