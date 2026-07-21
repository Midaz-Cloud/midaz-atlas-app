import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider, useKioskOrder } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { CallCashierScreen } from './CallCashierScreen';

function SeedOrderId({
  orderId,
  children,
}: {
  orderId?: string;
  children: ReactNode;
}) {
  const { setOrderId } = useKioskOrder();
  useEffect(() => {
    if (orderId) {
      setOrderId(orderId);
    }
  }, [orderId, setOrderId]);
  return children;
}

function withOrderSeed(orderId?: string) {
  return (Story: () => React.JSX.Element) =>
    paymentFlowStoryCanvas(
      <KioskOrderProvider>
        <SeedOrderId orderId={orderId}>
          <Story />
        </SeedOrderId>
      </KioskOrderProvider>,
    );
}

/** Figma 72:27 · P19 Llamar cajero */
const meta = {
  title: 'Modules/Payment/Assistance/CallCashierScreen',
  component: CallCashierScreen,
  decorators: [withI18nStorybook],
  args: {
    reason: 'fiscal_error' as const,
    onCancelOrder: fn(),
    onTimeout: fn(),
  },
} satisfies Meta<typeof CallCashierScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FiscalErrorSpanish: Story = {
  parameters: { locale: 'es' },
  decorators: [withOrderSeed('K-000023')],
};

export const ReferenceSpanish: Story = {
  parameters: { locale: 'es' },
  args: { reason: 'reference' },
  decorators: [withOrderSeed(undefined)],
};

export const English: Story = {
  parameters: { locale: 'en' },
  decorators: [withOrderSeed('K-000023')],
};
