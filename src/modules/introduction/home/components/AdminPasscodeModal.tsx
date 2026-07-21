import { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { getKioskAdminPasscode } from '@shared/config';
import { displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type AdminPasscodeModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AdminPasscodeModal({
  visible,
  onClose,
  onSuccess,
}: AdminPasscodeModalProps) {
  const { t } = useTranslation('introduction');
  const colors = useKioskScreenColors();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

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
        modalCard: {
          width: '100%',
          maxWidth: kioskScale(600),
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(24),
          borderWidth: kioskScale(3),
          borderColor: colors.productDetailBorder,
          padding: kioskScale(40),
          alignItems: 'center',
          gap: kioskScale(24),
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(40),
          lineHeight: kioskScale(48),
          color: colors.title,
          textAlign: 'center',
        },
        subtitle: {
          ...displayTextStyle(),
          fontSize: kioskScale(24),
          lineHeight: kioskScale(32),
          color: colors.menuSectionMuted,
          textAlign: 'center',
        },
        input: {
          width: '100%',
          height: kioskScale(96),
          borderRadius: kioskScale(16),
          borderWidth: kioskScale(2),
          borderColor: error ? '#ef4444' : colors.paymentReferenceInputBorder,
          backgroundColor: colors.screenBackground,
          paddingHorizontal: kioskScale(24),
          fontSize: kioskScale(36),
          color: colors.title,
          textAlign: 'center',
          letterSpacing: kioskScale(8),
        },
        errorText: {
          ...displayTextStyle(),
          fontSize: kioskScale(20),
          color: '#ef4444',
          textAlign: 'center',
        },
        actions: {
          flexDirection: 'row',
          gap: kioskScale(16),
          width: '100%',
          marginTop: kioskScale(12),
        },
        button: {
          flex: 1,
          height: kioskScale(80),
          borderRadius: kioskScale(16),
          alignItems: 'center',
          justifyContent: 'center',
        },
        cancelButton: {
          borderWidth: kioskScale(2),
          borderColor: colors.paymentReferenceInputBorder,
          backgroundColor: 'transparent',
        },
        submitButton: {
          backgroundColor: colors.priceAccent,
        },
        buttonText: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(24),
          color: colors.title,
        },
        cancelButtonText: {
          color: colors.menuSectionMuted,
        },
      }),
    [colors, error]
  );

  const handleSubmit = () => {
    const correctPasscode = getKioskAdminPasscode();
    if (passcode === correctPasscode) {
      setPasscode('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  const handleClose = () => {
    setPasscode('');
    setError(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.modalCard}>
          <Text style={styles.title}>Acceso de Administrador</Text>
          <Text style={styles.subtitle}>
            Ingresa el código de seguridad para acceder al panel de administración.
          </Text>

          <TextInput
            style={styles.input}
            value={passcode}
            onChangeText={(text) => {
              setPasscode(text);
              if (error) setError(false);
            }}
            placeholder="••••••"
            placeholderTextColor={colors.menuSectionMuted}
            secureTextEntry
            keyboardType="numeric"
            maxLength={10}
            autoFocus
          />

          {error ? (
            <Text style={styles.errorText}>Código incorrecto. Intenta de nuevo.</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}>
              <Text style={styles.buttonText}>Ingresar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
