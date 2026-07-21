import type { Meta, StoryObj } from '@storybook/react-native';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { ReferenceVerifyingScreen } from './ReferenceVerifyingScreen';

const meta = {
  title: 'Modules/Payment/Reference/ReferenceVerifyingScreen',
  component: ReferenceVerifyingScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
} satisfies Meta<typeof ReferenceVerifyingScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spanish: Story = {
  parameters: { locale: 'es' },
};

export const English: Story = {
  parameters: { locale: 'en' },
};
