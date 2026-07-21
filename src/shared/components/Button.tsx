import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, displayTextStyle, typography } from '@shared/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'outlineLight'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
};

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.backgroundDark,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.white,
  },
  outlineLight: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

const pressedVariantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    opacity: 0.9,
  },
  accent: {
    backgroundColor: colors.accentPressed,
  },
  outline: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  outlineLight: {
    backgroundColor: 'rgba(0,75,224,0.08)',
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});

const labelColors: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.white,
  accent: colors.white,
  outline: colors.white,
  outlineLight: colors.textOnLight,
  ghost: colors.white,
};

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
});

const labelSizeStyles = StyleSheet.create({
  sm: {
    fontSize: typography.label,
  },
  md: {
    fontSize: typography.button,
  },
  lg: {
    fontSize: typography.buttonLarge,
  },
});

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        pressed && !disabled && pressedVariantStyles[variant],
        disabled && styles.disabled,
        disabled && variant === 'outline' && styles.disabledOutline,
        disabled && variant === 'outlineLight' && styles.disabledOutlineLight,
        disabled && variant === 'ghost' && styles.disabledGhost,
        style,
      ]}
      {...rest}>
      <Text
        style={[
          displayTextStyle(),
          labelSizeStyles[size],
          { color: labelColors[variant] },
          disabled && styles.disabledLabel,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: colors.disabled,
    opacity: 0.65,
  },
  disabledOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.disabledText,
  },
  disabledOutlineLight: {
    backgroundColor: 'transparent',
    borderColor: colors.borderOnLight,
    opacity: 0.5,
  },
  disabledGhost: {
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  disabledLabel: {
    color: colors.disabledText,
  },
});
