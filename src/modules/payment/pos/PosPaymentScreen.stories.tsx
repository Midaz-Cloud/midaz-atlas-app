import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { PosPaymentScreen } from './PosPaymentScreen';

/** Figma 47:2 · P10 (a) POS / ECR */
const meta = {
  title: 'Modules/Payment/Pos/PosPaymentScreen',
  component: PosPaymentScreen,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <KioskOrderProvider>{paymentFlowStoryCanvas(<Story />)}</KioskOrderProvider>
    ),
  ],
  args: {
    onBack: fn(),
    onContinue: fn(),
    showSyncStatus: true,
  },
} satisfies Meta<typeof PosPaymentScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};

export const WithoutSyncStatus: Story = {
  parameters: { locale: 'es' },
  args: { showSyncStatus: false },
};
