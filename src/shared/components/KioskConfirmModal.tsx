import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  bodyTextStyle,
  brand,
  displayTextStyle,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type KioskConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  /** Default: confirm (Cancelar + Confirmar). `alert` shows a single Aceptar. */
  variant?: 'confirm' | 'alert';
  confirmLabel?: string;
  cancelLabel?: string;
  acceptLabel?: string;
  busy?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onAccept?: () => void;
  onRequestClose?: () => void;
  titleTestID?: string;
  messageTestID?: string;
  confirmTestID?: string;
  cancelTestID?: string;
  acceptTestID?: string;
};

/**
 * Shared kiosk confirmation / result dialog (same look as FailedPaymentDetailScreen).
 */
export function KioskConfirmModal({
  visible,
  title,
  message,
  variant = 'confirm',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  acceptLabel = 'Aceptar',
  busy = false,
  onConfirm,
  onCancel,
  onAccept,
  onRequestClose,
  titleTestID,
  messageTestID,
  confirmTestID,
  cancelTestID,
  acceptTestID,
}: KioskConfirmModalProps) {
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
          padding: kioskScale(36),
          alignItems: 'center',
          gap: kioskScale(20),
          ...kioskScreenShadows.menuCard,
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(32),
          color: brand.black,
          textAlign: 'center',
        },
        message: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          lineHeight: kioskScale(30),
          color: brand.black,
          textAlign: 'center',
        },
        actions: {
          width: '100%',
          gap: kioskScale(12),
          marginTop: kioskScale(8),
        },
        button: {
          width: '100%',
          minHeight: kioskScale(88),
          borderRadius: kioskScale(20),
          backgroundColor: colors.priceAccent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        buttonSecondary: {
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScale(3),
          borderColor: colors.productDetailBorder,
        },
        buttonText: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(26),
          color: colors.title,
        },
        buttonSecondaryText: {
          color: brand.black,
        },
      }),
    [colors],
  );

  const handleRequestClose = () => {
    if (busy) {
      return;
    }
    if (variant === 'confirm') {
      onCancel?.();
    } else {
      onAccept?.();
    }
    onRequestClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}>
      <Pressable style={styles.backdrop} onPress={handleRequestClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title} testID={titleTestID}>
            {title}
          </Text>
          <Text style={styles.message} testID={messageTestID}>
            {message}
          </Text>
          {variant === 'confirm' ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  if (!busy) {
                    onCancel?.();
                  }
                }}
                disabled={busy}
                testID={cancelTestID}>
                <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  if (!busy) {
                    onConfirm?.();
                  }
                }}
                disabled={busy}
                testID={confirmTestID}>
                <Text style={styles.buttonText}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={() => onAccept?.()}
              testID={acceptTestID}>
              <Text style={styles.buttonText}>{acceptLabel}</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
