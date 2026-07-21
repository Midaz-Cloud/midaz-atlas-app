import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';

import { KioskOrderProvider, useKioskOrder } from '@shared/kiosk-order';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { useOrderOutcomeScreen } from './hooks/useOrderOutcomeScreen';
import { OrderOutcomeQrContent } from './OrderOutcomeQrContent';

function SeedOrderOutcome({
  orderId,
  unitPriceUsd,
  children,
}: {
  orderId: string;
  unitPriceUsd: number;
  children: ReactNode;
}) {
  const { setOrderId, addProduct, resetOrder } = useKioskOrder();
  useEffect(() => {
    resetOrder();
    addProduct('story-product', unitPriceUsd, 1);
    setOrderId(orderId);
  }, [orderId, unitPriceUsd, setOrderId, addProduct, resetOrder]);
  return children;
}

function OrderOutcomeQrContentStory() {
  const { digitalTicket } = useOrderOutcomeScreen();
  return <OrderOutcomeQrContent copy={digitalTicket} />;
}

/** Figma 64:2 · P15 Ticket QR */
const meta = {
  title: 'Modules/Payment/Outcome/OrderOutcomeQrContent',
  component: OrderOutcomeQrContentStory,
  decorators: [
    withI18nStorybook,
    (Story) =>
      paymentFlowStoryCanvas(
        <KioskOrderProvider>
          <SeedOrderOutcome orderId="K-000492" unitPriceUsd={5.35}>
            <Story />
          </SeedOrderOutcome>
        </KioskOrderProvider>,
      ),
  ],
} satisfies Meta<typeof OrderOutcomeQrContentStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
