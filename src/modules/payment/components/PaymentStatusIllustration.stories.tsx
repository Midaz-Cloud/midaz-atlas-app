import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { Text, View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { PaymentPrimaryCta, PaymentReferenceOutlineCta } from './index';
import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { PaymentStatusIllustration } from './PaymentStatusIllustration';

const meta = {
  title: 'Modules/Payment/Reference/PaymentStatusIllustration',
  component: PaymentStatusIllustration,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
} satisfies Meta<typeof PaymentStatusIllustration>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Verifying: Story = {
  args: {
    variant: 'verifying',
    title: 'Verificando pago...',
    subtitle: 'Por favor espera, estamos procesando tu solicitud.',
    dontCloseLabel: 'No cierres esta ventana.',
  },
};

export const Processing: Story = {
  args: {
    variant: 'processing',
    title: 'Procesando tu pedido...',
    subtitle: 'Registrando transacción',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: '¡Pedido confirmado!',
    subtitle: '',
    subtitleContent: (
      <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 42.5 }}>
        Ticket impreso correctamente. Retira tu pedido cuando veas tu número en pantalla.
      </Text>
    ),
  },
};

export const FiscalError: Story = {
  args: {
    variant: 'fiscal_error',
    title: 'Error en la impresora fiscal',
    subtitle: '',
    subtitleContent: (
      <View style={{ alignItems: 'center' }}>
        <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 42.5, fontWeight: '600' }}>
          Tu pago fue registrado con éxito.
        </Text>
        <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 42.5 }}>
          Por favor, solicita tu ticket al cajero
        </Text>
      </View>
    ),
    footer: (
      <PaymentPrimaryCta
        label="Llamar al cajero"
        showChevron={false}
        onPress={fn()}
      />
    ),
  },
};

export const ReferenceError: Story = {
  args: {
    variant: 'error',
    title: 'Referencia no encontrada',
    subtitle: 'Verifica los dígitos ingresados e intenta nuevamente.',
  },
  render: () => (
    <View style={{ padding: 24, width: '100%' }}>
      <PaymentStatusIllustration
        variant="error"
        title="Referencia no encontrada"
        subtitle="Verifica los dígitos ingresados e intenta nuevamente."
        footer={
          <View style={{ gap: 30, width: '100%', marginTop: 50 }}>
            <PaymentPrimaryCta
              label="Reintentar"
              showChevron={false}
              onPress={fn()}
            />
            <PaymentReferenceOutlineCta label="Solicitar ayuda" onPress={fn()} />
          </View>
        }
      />
    </View>
  ),
};
