import type { Meta, StoryObj } from '@storybook/react-native';
import { StyleSheet, View } from 'react-native';
import { fn } from 'storybook/test';

import { kioskScreenColors, kioskScreenLayout } from '@shared/theme/kioskScreen';
import { kioskScale } from '@shared/utils';

import { HeroSelectionCard } from '@modules/introduction/components';
import { SelectionOptionCard } from './SelectionOptionCard';
import { KioskScreenLayout } from './KioskScreenLayout';

const meta = {
  title: 'Shared/KioskScreenLayout',
  component: KioskScreenLayout,
  args: {
    onBack: fn(),
    showPattern: true,
    contentAlign: 'top' as const,
    children: null,
  },
} satisfies Meta<typeof KioskScreenLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Misma estructura que P2 — cards compactas bajo el título. */
export const LanguageStep: Story = {
  args: {
    title: 'Select Language',
    subtitle: 'Elige tu idioma / Choose your language',
  },
  render: args => (
    <KioskScreenLayout {...args} contentStyle={storyStyles.content}>
      <View style={storyStyles.languageOptions}>
        <SelectionOptionCard
          variant="featured"
          label="Español"
          description="Continuar en Español"
          leadingBackgroundColor="#fff7ed"
          onPress={fn()}
        />
        <SelectionOptionCard
          variant="featured"
          label="English"
          description="Continue in English"
          leadingBackgroundColor="#eff6ff"
          onPress={fn()}
        />
      </View>
    </KioskScreenLayout>
  ),
};

/** Misma estructura que P3 — hero cards bajo el título (sin centrado vertical extra). */
export const OrderTypeStep: Story = {
  args: {
    title: '¿Cómo quieres tu pedido?',
    subtitle: 'Selecciona tu preferencia',
  },
  render: args => (
    <KioskScreenLayout {...args} contentStyle={storyStyles.content}>
      <View style={storyStyles.orderOptions}>
        <HeroSelectionCard label="Para comer aquí" imageVariant="dineIn" onPress={fn()} />
        <HeroSelectionCard label="Para llevar" imageVariant="takeOut" onPress={fn()} />
      </View>
    </KioskScreenLayout>
  ),
};

export const ContentCentered: Story = {
  args: {
    title: 'Título centrado',
    subtitle: 'contentAlign center',
    contentAlign: 'center',
  },
  render: args => (
    <KioskScreenLayout {...args}>
      <View style={storyStyles.placeholder} />
    </KioskScreenLayout>
  ),
};

export const WithoutPattern: Story = {
  args: {
    showPattern: false,
    title: 'Sin patrón',
    subtitle: 'Solo fondo crema',
  },
};

const storyStyles = StyleSheet.create({
  content: {
    paddingBottom: kioskScreenLayout.optionsBottomPadding,
  },
  languageOptions: {
    width: '100%',
    gap: kioskScreenLayout.optionsGap,
  },
  orderOptions: {
    width: '100%',
    alignItems: 'center',
    gap: kioskScale(45),
  },
  placeholder: {
    height: kioskScale(200),
    backgroundColor: kioskScreenColors.cardBackground,
    borderRadius: 12,
  },
});
