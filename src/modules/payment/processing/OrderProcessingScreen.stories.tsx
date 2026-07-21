import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { OrderProcessingScreen } from './OrderProcessingScreen';

/** Figma 55:191 · P13 Procesando orden */
const meta = {
  title: 'Modules/Payment/Processing/OrderProcessingScreen',
  component: OrderProcessingScreen,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <KioskOrderProvider>
        {paymentFlowStoryCanvas(<Story />)}
      </KioskOrderProvider>
    ),
  ],
  args: {
    onComplete: fn(),
  },
} satisfies Meta<typeof OrderProcessingScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
