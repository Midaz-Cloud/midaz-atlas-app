import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { MobilePaymentChangeDocumentScreen } from './MobilePaymentChangeDocumentScreen';

/** Figma 205:390 · P10 (d) Nueva cédula (pago móvil) */
const meta = {
  title: 'Modules/Payment/Mobile/MobilePaymentChangeDocumentScreen',
  component: MobilePaymentChangeDocumentScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    initialDocumentId: 'V19301293',
    onBack: fn(),
    onContinue: fn(),
  },
} satisfies Meta<typeof MobilePaymentChangeDocumentScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
