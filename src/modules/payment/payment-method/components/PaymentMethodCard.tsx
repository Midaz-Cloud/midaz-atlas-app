import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import type { PaymentMethodId } from '../../types';
import { PaymentMethodIcon } from './PaymentMethodIcon';

export type PaymentMethodCardProps = {
  methodId: PaymentMethodId;
  title: string;
  description: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
};

export function PaymentMethodCard({
  methodId,
  title,
  description,
  selected = false,
  onPress,
  testID,
}: PaymentMethodCardProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.paymentMethodCardGap,
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScreenLayout.paymentMethodCardBorderWidth,
          borderColor: colors.paymentMethodCardBorder,
          borderRadius: kioskScreenLayout.paymentMethodCardRadius,
          padding: kioskScreenLayout.paymentMethodCardPadding,
        },
        pressed: {
          opacity: 0.92,
        },
        iconSlot: {
          width: kioskScreenLayout.paymentMethodIconSize,
          height: kioskScreenLayout.paymentMethodIconSize,
          borderRadius: kioskScreenLayout.paymentMethodIconRadius,
          borderWidth: kioskScreenLayout.paymentMethodIconBorderWidth,
          borderColor: colors.paymentMethodIconBorder,
          backgroundColor: colors.paymentMethodIconBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        textColumn: {
          flex: 1,
          gap: kioskScreenLayout.badgePaddingVertical,
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentMethodTitleSize,
          lineHeight: kioskScreenLayout.paymentMethodTitleLineHeight,
          color: colors.title,
        },
        description: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentMethodSubtitleSize,
          lineHeight: kioskScreenLayout.paymentMethodSubtitleLineHeight,
          color: colors.paymentMethodSubtitle,
        },
        radio: {
          width: kioskScreenLayout.paymentMethodRadioSize,
          height: kioskScreenLayout.paymentMethodRadioSize,
          borderRadius: kioskScreenLayout.paymentMethodRadioSize / 2,
          borderWidth: kioskScreenLayout.paymentMethodRadioBorderWidth,
          borderColor: colors.paymentMethodRadioBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        radioSelected: {
          borderColor: colors.paymentMethodRadioSelected,
        },
        radioInner: {
          width: kioskScreenLayout.paymentMethodRadioInnerSize,
          height: kioskScreenLayout.paymentMethodRadioInnerSize,
          borderRadius: kioskScreenLayout.paymentMethodRadioInnerSize / 2,
          backgroundColor: colors.paymentMethodRadioSelected,
        },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        kioskScreenShadows.paymentMethodCard,
        pressed && styles.pressed,
      ]}
      testID={testID ?? `payment-method-${methodId}`}>
      <View style={styles.iconSlot}>
        <PaymentMethodIcon methodId={methodId} />
      </View>

      <View style={styles.textColumn}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}
