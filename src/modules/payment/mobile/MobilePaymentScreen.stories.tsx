import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { useKioskCustomer } from '@shared/customer';
import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { withKioskCustomerProvider } from '@modules/customer/customerStoryDecorators';
import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { MobilePaymentScreen } from './MobilePaymentScreen';
import { useMobilePaymentPayerForm } from './hooks/useMobilePaymentPayerForm';

function MobilePaymentScreenStory() {
  const { setCustomer } = useKioskCustomer();
  const payerForm = useMobilePaymentPayerForm();

  useEffect(() => {
    setCustomer({
      id: 1,
      documentId: 'V19301293',
      firstName: 'Cliente',
      lastName: 'Demo',
      phone: '04141234567',
      email: '',
    });
  }, [setCustomer]);

  return (
    <MobilePaymentScreen
      payerForm={payerForm}
      onBack={fn()}
      onValidate={fn()}
      onChangeDocument={fn()}
    />
  );
}

/** Figma 205:176 · P10 (c) Confirmar pago móvil */
const meta = {
  title: 'Modules/Payment/Mobile/MobilePaymentScreen',
  component: MobilePaymentScreenStory,
  decorators: [
    withI18nStorybook,
    withKioskCustomerProvider,
    (Story) => (
      <KioskOrderProvider>{paymentFlowStoryCanvas(<Story />)}</KioskOrderProvider>
    ),
  ],
} satisfies Meta<typeof MobilePaymentScreenStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
