import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { TransferReferenceFlow } from './TransferReferenceFlow';

const meta = {
  title: 'Modules/Payment/Reference/TransferReferenceFlow',
  component: TransferReferenceFlow,
  decorators: [
    withI18nStorybook,
    (Story) => (
      <KioskOrderProvider>
        {paymentFlowStoryCanvas(<Story />)}
      </KioskOrderProvider>
    ),
  ],
  args: {
    methodId: 'mobile' as const,
    onBackToAccount: fn(),
    onReferenceValidated: fn(),
    onRequestHelp: fn(),
  },
} satisfies Meta<typeof TransferReferenceFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const Zelle: Story = {
  args: { methodId: 'zelle' },
};
