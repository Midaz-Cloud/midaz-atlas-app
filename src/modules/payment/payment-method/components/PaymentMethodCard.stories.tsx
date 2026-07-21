import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { PaymentMethodCard } from './PaymentMethodCard';
import { paymentMethodStoryCanvas } from './paymentMethodStoryDecorators';

/** Figma 43:162–43:194 */
const meta = {
  title: 'Modules/Payment/PaymentMethodCard',
  component: PaymentMethodCard,
  decorators: [withI18nStorybook, (Story) => paymentMethodStoryCanvas(<Story />)],
  args: {
    methodId: 'pos',
    title: 'Punto de venta',
    description: 'Débito o crédito en caja',
    selected: false,
    onPress: fn(),
  },
} satisfies Meta<typeof PaymentMethodCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pos: Story = {
  parameters: { locale: 'es' },
  args: { methodId: 'pos' },
};

export const Mobile: Story = {
  parameters: { locale: 'es' },
  args: {
    methodId: 'mobile',
    title: 'Pago móvil',
    description: 'Transferencia inmediata',
  },
};

export const Zelle: Story = {
  parameters: { locale: 'es' },
  args: {
    methodId: 'zelle',
    title: 'Zelle',
    description: 'Pago en divisas',
  },
};

export const Selected: Story = {
  parameters: { locale: 'es' },
  args: { methodId: 'pos', selected: true },
};
