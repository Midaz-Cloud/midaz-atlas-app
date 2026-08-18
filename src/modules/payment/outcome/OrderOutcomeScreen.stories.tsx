import type { ReactNode } from 'react';

import { useEffect } from 'react';

import type { Meta, StoryObj } from '@storybook/react-native';

import { fn } from 'storybook/test';



import { KioskOrderProvider, useKioskOrder } from '@shared/kiosk-order';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';



import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';

import { OrderOutcomeScreen } from './OrderOutcomeScreen';



function SeedOrderId({

  orderId,

  children,

}: {

  orderId: string;

  children: ReactNode;

}) {

  const { setOrderId } = useKioskOrder();

  useEffect(() => {

    setOrderId(orderId);

  }, [orderId, setOrderId]);

  return children;

}



/** Orden + total de ejemplo P15 (Figma Orden #492 · USD 5.35). */

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



function outcomeCanvas(children: ReactNode, orderId?: string) {

  return (

    <KioskOrderProvider>

      {orderId ? <SeedOrderId orderId={orderId}>{children}</SeedOrderId> : children}

    </KioskOrderProvider>

  );

}



function outcomeQrCanvas(children: ReactNode) {

  return (

    <KioskOrderProvider>

      <SeedOrderOutcome orderId="K-000492" unitPriceUsd={5.35}>

        {children}

      </SeedOrderOutcome>

    </KioskOrderProvider>

  );

}



/** Figma 57:235 · 64:2 · 57:346 */

const meta = {

  title: 'Modules/Payment/Outcome/OrderOutcomeScreen',

  component: OrderOutcomeScreen,

  decorators: [withI18nStorybook],

  argTypes: {

    successDisplayMode: {

      control: 'radio',

      options: ['number', 'qr'],

    },

  },

  args: {

    variant: 'success' as const,

    successDisplayMode: 'number' as const,

    onCallCashier: fn(),

    onRetryFiscal: fn(),

    onSessionComplete: fn(),

  },

} satisfies Meta<typeof OrderOutcomeScreen>;



export default meta;



type Story = StoryObj<typeof meta>;



export const SuccessSpanish: Story = {

  parameters: { locale: 'es' },

  decorators: [

    (Story) =>

      paymentFlowStoryCanvas(

        outcomeCanvas(<Story />, 'K-000023'),

      ),

  ],

};



export const SuccessEnglish: Story = {

  parameters: { locale: 'en' },

  decorators: SuccessSpanish.decorators,

};



export const SuccessQrSpanish: Story = {

  parameters: { locale: 'es' },

  args: { successDisplayMode: 'qr' },

  decorators: [

    (Story) => paymentFlowStoryCanvas(outcomeQrCanvas(<Story />)),

  ],

};



export const SuccessQrEnglish: Story = {

  parameters: { locale: 'en' },

  args: { successDisplayMode: 'qr' },

  decorators: SuccessQrSpanish.decorators,

};



export const FiscalErrorSpanish: Story = {

  parameters: { locale: 'es' },

  args: { variant: 'fiscal_error' },

  decorators: [

    (Story) => paymentFlowStoryCanvas(outcomeCanvas(<Story />)),

  ],

};



export const FiscalErrorEnglish: Story = {

  parameters: { locale: 'en' },

  args: { variant: 'fiscal_error' },

  decorators: FiscalErrorSpanish.decorators,

};



export const TicketPrintFailedSpanish: Story = {

  parameters: { locale: 'es' },

  args: { variant: 'ticket_print_failed', shortCode: 'JSGCHA' },

  decorators: SuccessSpanish.decorators,

};



export const TicketPrintFailedEnglish: Story = {

  parameters: { locale: 'en' },

  args: { variant: 'ticket_print_failed', shortCode: 'JSGCHA' },

  decorators: SuccessSpanish.decorators,

};


