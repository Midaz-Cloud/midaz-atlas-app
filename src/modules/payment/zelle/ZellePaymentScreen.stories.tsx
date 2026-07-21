import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { ZellePaymentScreen } from './ZellePaymentScreen';

/** Figma 48:66 · P10 (c) Zelle */
const meta = {
  title: 'Modules/Payment/Zelle/ZellePaymentScreen',
  component: ZellePaymentScreen,
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
} satisfies Meta<typeof ZellePaymentScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
