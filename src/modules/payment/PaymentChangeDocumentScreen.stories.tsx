import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from './components/paymentFlowStoryDecorators';
import { PaymentChangeDocumentScreen } from './PaymentChangeDocumentScreen';

/** Figma 205:390 · P10 (d) Nueva cédula del pagador (POS / pago móvil) */
const meta = {
  title: 'Modules/Payment/PaymentChangeDocumentScreen',
  component: PaymentChangeDocumentScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    initialDocumentId: 'V19301293',
    onBack: fn(),
    onContinue: fn(),
  },
} satisfies Meta<typeof PaymentChangeDocumentScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
