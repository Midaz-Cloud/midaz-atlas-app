import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenLayout } from '@shared/theme';

import IconCard from '@assets/images/payment/pos/icon-card.svg';
import IconMobile from '@assets/images/payment/mobile/icon-mobile.svg';
import IconZelle from '@assets/images/payment/zelle/icon-zelle-hero.svg';
import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { PaymentFlowHero } from './PaymentFlowHero';

const meta = {
  title: 'Modules/Payment/Flow/PaymentFlowHero',
  component: PaymentFlowHero,
  decorators: [
    withI18nStorybook,
    (Story) =>
      paymentFlowStoryCanvas(
        <View style={{ padding: 24, alignSelf: 'stretch' }}>
          <Story />
        </View>,
      ),
  ],
} satisfies Meta<typeof PaymentFlowHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PosSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    title: 'Acerca tu tarjeta',
    subtitle: 'Usa tu tarjeta de débito, crédito o con tu NFC.',
    minHeight: kioskScreenLayout.paymentPosHeroMinHeight,
    icon: (
      <IconCard
        width={kioskScreenLayout.paymentPosHeroIconWidth}
        height={kioskScreenLayout.paymentPosHeroIconHeight}
      />
    ),
  },
};

export const ZelleSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    title: 'Zelle',
    subtitle: 'Envía tu pago de forma rápida y segura.',
    minHeight: kioskScreenLayout.paymentZelleHeroMinHeight,
    icon: (
      <IconZelle
        width={kioskScreenLayout.paymentZelleHeroIconWidth}
        height={kioskScreenLayout.paymentZelleHeroIconHeight}
      />
    ),
  },
};

export const MobileSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    title: 'Pago móvil',
    subtitle: 'Completa los datos del pago móvil o escanea el código QR.',
    minHeight: kioskScreenLayout.paymentMobileHeroMinHeight,
    icon: (
      <IconMobile
        width={kioskScreenLayout.paymentPosHeroIconWidth}
        height={kioskScreenLayout.paymentMobileHeroIconHeight}
      />
    ),
  },
};
