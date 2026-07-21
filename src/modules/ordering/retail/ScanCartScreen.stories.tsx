import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { KioskOrderProvider } from '@shared/kiosk-order/KioskOrderProvider';

import { ScanCartScreen } from './ScanCartScreen';

const withKioskOrder = (Story: React.ComponentType) => (
  <KioskOrderProvider>
    <Story />
  </KioskOrderProvider>
);

const meta = {
  title: 'Modules/Ordering/Retail/ScanCart',
  component: ScanCartScreen,
  decorators: [withI18nStorybook, withKioskOrder],
  args: {
    onBack: fn(),
    onProceedToPayment: fn(),
  },
} satisfies Meta<typeof ScanCartScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptySpanish: Story = {
  parameters: { locale: 'es' },
};

export const EmptyEnglish: Story = {
  parameters: { locale: 'en' },
};
