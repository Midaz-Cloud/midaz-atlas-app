import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { paymentFlowStoryCanvas } from '../components/paymentFlowStoryDecorators';
import { ReferenceEntryScreen } from './ReferenceEntryScreen';

const meta = {
  title: 'Modules/Payment/Reference/ReferenceEntryScreen',
  component: ReferenceEntryScreen,
  decorators: [withI18nStorybook, (Story) => paymentFlowStoryCanvas(<Story />)],
  args: {
    methodId: 'mobile' as const,
    reference: '',
    onBack: fn(),
    onReferenceChange: fn(),
    onValidate: fn(),
  },
} satisfies Meta<typeof ReferenceEntryScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MobileSpanish: Story = {
  parameters: { locale: 'es' },
};

export const ZelleEnglish: Story = {
  parameters: { locale: 'en' },
  args: { methodId: 'zelle' },
};

export const WithDigits: Story = {
  args: { reference: '123456' },
};
