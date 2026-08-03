import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KIOSK_CART_MAX_UNITS } from '@shared/kiosk-order';
import { displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type CartSessionLimitModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function CartSessionLimitModal({
  visible,
  onClose,
}: CartSessionLimitModalProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: kioskScale(40),
        },
        card: {
          width: '100%',
          maxWidth: kioskScale(600),
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(24),
          borderWidth: kioskScale(3),
          borderColor: colors.productDetailBorder,
          padding: kioskScale(40),
          alignItems: 'center',
          gap: kioskScale(20),
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(36),
          lineHeight: kioskScale(44),
          color: colors.title,
          textAlign: 'center',
        },
        message: {
          ...displayTextStyle(),
          fontSize: kioskScale(24),
          lineHeight: kioskScale(32),
          color: colors.menuSectionMuted,
          textAlign: 'center',
        },
        button: {
          marginTop: kioskScale(12),
          minHeight: kioskScale(80),
          width: '100%',
          borderRadius: kioskScale(16),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.priceAccent,
          paddingHorizontal: kioskScale(24),
        },
        buttonText: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(24),
          color: colors.cardBackground,
        },
      }),
    [colors],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}>
      <View style={styles.backdrop} testID="cart-session-limit-modal">
        <View style={styles.card}>
          <Text style={styles.title}>{t('cart.sessionLimit.title')}</Text>
          <Text style={styles.message}>
            {t('cart.sessionLimit.message', { max: KIOSK_CART_MAX_UNITS })}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cart.sessionLimit.acknowledge')}
            onPress={onClose}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
            testID="cart-session-limit-ok">
            <Text style={styles.buttonText}>{t('cart.sessionLimit.acknowledge')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
