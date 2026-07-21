import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';
import { colors, displayTextStyle, typography } from '@shared/theme';

import { Button, type ButtonVariant } from './Button';

const variants: ButtonVariant[] = [
  'primary',
  'secondary',
  'accent',
  'outline',
  'outlineLight',
  'ghost',
];

function VariantRow({
  backgroundColor,
  labelColor,
  surface,
}: {
  backgroundColor: string;
  labelColor: string;
  surface?: 'dark' | 'light';
}) {
  const { t } = useTranslation('common');
  const continueLabel = t('continue');

  return (
    <View style={[styles.section, { backgroundColor }]}>
      <Text style={[styles.sectionTitle, displayTextStyle(), { color: labelColor }]}>
        {surface === 'light' ? 'Light surface' : 'On brand background'}
      </Text>
      {variants
        .filter(v => (surface === 'light' ? v !== 'ghost' && v !== 'outline' : v !== 'outlineLight'))
        .map(variant => (
          <View key={variant} style={styles.row}>
            <Text style={[styles.variantLabel, { color: labelColor }]}>{variant}</Text>
            <Button title={continueLabel} variant={variant} onPress={fn()} />
            <Button
              title={continueLabel}
              variant={variant}
              disabled
              onPress={fn()}
              style={styles.disabledSpacing}
            />
          </View>
        ))}
    </View>
  );
}

function ContinueLabelButton(props: ComponentProps<typeof Button>) {
  const { t } = useTranslation('common');
  return <Button {...props} title={props.title ?? t('continue')} />;
}

const meta = {
  title: 'Shared/Button',
  component: ContinueLabelButton,
  decorators: [
    withI18nStorybook,
    Story => (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Story />
      </ScrollView>
    ),
  ],
  args: {
    onPress: fn(),
  },
} satisfies Meta<typeof ContinueLabelButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DigitalMode: Story = {
  render: () => (
    <>
      <VariantRow backgroundColor={colors.background} labelColor={colors.text} />
      <View style={[styles.section, { backgroundColor: colors.surface, padding: 24 }]}>
        <Text
          style={[
            styles.sectionTitle,
            displayTextStyle(),
            { color: colors.textOnLight },
          ]}>
          Card on neutral surface
        </Text>
        <Button title="Primary action" variant="primary" onPress={fn()} />
        <Button
          title="Secondary"
          variant="outlineLight"
          onPress={fn()}
          style={styles.disabledSpacing}
        />
      </View>
    </>
  ),
};

export const FormalMode: Story = {
  render: () => (
    <VariantRow
      backgroundColor={colors.backgroundDark}
      labelColor={colors.text}
    />
  ),
};

export const EnergeticMode: Story = {
  render: () => (
    <VariantRow
      backgroundColor={colors.backgroundWarm}
      labelColor={colors.text}
    />
  ),
};

export const Sizes: Story = {
  render: () => (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, displayTextStyle(), { color: colors.text }]}>
        Sizes
      </Text>
      <Button title="Small" size="sm" onPress={fn()} style={styles.disabledSpacing} />
      <Button title="Medium" size="md" onPress={fn()} style={styles.disabledSpacing} />
      <Button title="Large" size="lg" onPress={fn()} style={styles.disabledSpacing} />
    </View>
  ),
};

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  section: {
    padding: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: typography.title,
    marginBottom: 8,
  },
  row: {
    gap: 8,
    marginBottom: 16,
  },
  variantLabel: {
    fontSize: typography.caption,
    textTransform: 'capitalize',
    opacity: 0.85,
  },
  disabledSpacing: {
    marginTop: 8,
  },
});
