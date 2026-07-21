import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { ProductDetailPrimaryCta } from './ProductDetailPrimaryCta';
import { productDetailStoryCanvas } from './productDetailStoryDecorators';

const meta = {
  title: 'Modules/Ordering/ProductDetail/ProductDetailPrimaryCta',
  component: ProductDetailPrimaryCta,
  decorators: [
    withI18nStorybook,
    (Story) => productDetailStoryCanvas(<Story />, 160),
  ],
  args: {
    onPress: fn(),
  },
} satisfies Meta<typeof ProductDetailPrimaryCta>;

export default meta;

type Story = StoryObj<typeof meta>;

/** CTA naranja (Figma 35:196–35:200). */
export const ContinueSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    label: 'Continuar',
  },
};

export const AddSpanish: Story = {
  parameters: { locale: 'es' },
  args: {
    label: 'Agregar',
  },
};

export const ContinueEnglish: Story = {
  parameters: { locale: 'en' },
  args: {
    label: 'Next',
  },
};

export const Disabled: Story = {
  parameters: { locale: 'es' },
  args: {
    label: 'Continuar',
    disabled: true,
  },
};
