import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { kioskScreenLayout } from '@shared/theme';

import { paymentFlowStoryCanvas } from './paymentFlowStoryDecorators';
import { PaymentTotalBanner } from './PaymentTotalBanner';

/** Figma 47:14 */
const meta = {
  title: 'Modules/Payment/Flow/PaymentTotalBanner',
  component: PaymentTotalBanner,
  decorators: [
    withI18nStorybook,
    (Story) =>
      paymentFlowStoryCanvas(
        <View
          style={{
            paddingHorizontal: kioskScreenLayout.paymentPosContentPaddingHorizontal,
            paddingTop: 24,
          }}>
          <Story />
        </View>,
      ),
  ],
  args: {
    label: 'Monto total',
    totalVes: 563.76,
  },
} satisfies Meta<typeof PaymentTotalBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};
