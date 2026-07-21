import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import IconMobile from '@assets/images/payment/mobile/icon-mobile.svg';

import { paymentFlowStoryCanvas } from '../../components/paymentFlowStoryDecorators';
import { OrderOutcomeInfoBanner } from './OrderOutcomeInfoBanner';

const iconSize = kioskScreenLayout.paymentOutcomeQrBannerIconSize;

const meta = {
  title: 'Modules/Payment/Outcome/OrderOutcomeInfoBanner',
  component: OrderOutcomeInfoBanner,
  decorators: [
    (Story) =>
      paymentFlowStoryCanvas(
        <View style={{ padding: 24, alignSelf: 'stretch' }}>
          <Story />
        </View>,
      ),
  ],
  args: {
    message: 'Guarda tu ticket en el móvil',
    icon: <IconMobile width={iconSize} height={iconSize} />,
  },
} satisfies Meta<typeof OrderOutcomeInfoBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
