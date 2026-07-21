import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { defaultOrderFiscalConfig } from '../data/mockOrderFiscalConfig';
import { cartStoryCanvas } from '../cart/components/cartStoryDecorators';
import { CartCheckoutBcvBanner } from './CartCheckoutBcvBanner';

/** Figma 41:93 — banner tasa BCV en checkout. */
const meta = {
  title: 'Modules/Ordering/CartCheckoutBcvBanner',
  component: CartCheckoutBcvBanner,
  decorators: [
    withI18nStorybook,
    (Story) => cartStoryCanvas(<Story />, 160),
  ],
  args: {
    bcvRate: defaultOrderFiscalConfig.usdToVesRate,
  },
} satisfies Meta<typeof CartCheckoutBcvBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
