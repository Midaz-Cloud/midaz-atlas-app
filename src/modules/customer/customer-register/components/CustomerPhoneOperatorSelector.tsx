import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  VENEZUELA_MOBILE_OPERATOR_CODES,
  type VenezuelaMobileOperatorCode,
} from '@shared/phone';
import {
  displayTextStyle,
  kioskScreenLayout,
  mediumTextStyle,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { useCustomerRegisterFieldStyles } from '../theme/customerRegisterFieldStyles';

export type CustomerPhoneOperatorSelectorProps = {
  value: VenezuelaMobileOperatorCode;
  onChange: (code: VenezuelaMobileOperatorCode) => void;
};

export function CustomerPhoneOperatorSelector({
  value,
  onChange,
}: CustomerPhoneOperatorSelectorProps) {
  const { t } = useTranslation('customer');
  const colors = useKioskScreenColors();
  const fieldStyles = useCustomerRegisterFieldStyles();
  const [open, setOpen] = useState(false);
  const displayCode = `0${value}`;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trigger: {
          ...fieldStyles.input,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'stretch',
          width: '100%',
          gap: kioskScale(8),
          paddingHorizontal: kioskScale(28),
          justifyContent: 'space-between',
        },
        codeText: {
          ...fieldStyles.inputValueText,
          flexShrink: 0,
        },
        chevron: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceInputLabelSize * 0.7,
          color: colors.menuSectionMuted,
          flexShrink: 0,
        },
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(30, 41, 59, 0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: kioskScreenLayout.paymentReferenceContentPaddingHorizontal,
        },
        menuCard: {
          alignSelf: 'stretch',
          maxWidth: kioskScreenLayout.paymentReferenceMaxWidth,
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScreenLayout.paymentReferenceInputRadius,
          borderWidth: kioskScreenLayout.paymentReferenceInputBorderWidth,
          borderColor: colors.paymentReferenceInputBorder,
          padding: kioskScale(24),
          gap: kioskScale(16),
        },
        menuTitle: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceInputLabelSize,
          lineHeight: kioskScreenLayout.paymentReferenceInputLabelLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'center',
        },
        menuItem: {
          minHeight: kioskScale(96),
          borderRadius: kioskScale(20),
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: kioskScale(2),
          borderColor: colors.paymentReferenceInputBorder,
          backgroundColor: colors.screenBackground,
          paddingHorizontal: kioskScale(16),
          gap: kioskScale(4),
        },
        menuItemSelected: {
          backgroundColor: colors.modifierSelectedBg,
          borderColor: colors.priceAccent,
        },
        menuItemCode: {
          ...displayTextStyle(),
          fontSize: kioskScale(48),
          lineHeight: kioskScale(56),
          color: colors.menuSectionMuted,
        },
        menuItemCarrier: {
          ...mediumTextStyle(),
          fontSize: kioskScale(28),
          color: colors.menuSectionMuted,
        },
        menuItemCarrierSelected: {
          color: colors.title,
        },
        menuItemLabelSelected: {
          color: colors.title,
        },
      }),
    [colors, fieldStyles],
  );

  const close = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (code: VenezuelaMobileOperatorCode) => {
      onChange(code);
      close();
    },
    [close, onChange],
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('register.phoneOperatorA11y', { code: value })}
        onPress={() => setOpen(true)}
        style={styles.trigger}
        testID="customer-phone-operator-selector">
        <Text style={styles.codeText} numberOfLines={1}>
          {displayCode}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={t('register.phoneOperatorClose')}
            onPress={close}
          />
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{t('register.phoneOperatorTitle')}</Text>
            {VENEZUELA_MOBILE_OPERATOR_CODES.map((code) => {
              const selected = code === value;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleSelect(code)}
                  style={[styles.menuItem, selected && styles.menuItemSelected]}
                  testID={`customer-phone-operator-${code}`}>
                  <Text
                    style={[
                      styles.menuItemCode,
                      selected && styles.menuItemLabelSelected,
                    ]}>
                    0{code}
                  </Text>
                  <Text
                    style={[
                      styles.menuItemCarrier,
                      selected && styles.menuItemCarrierSelected,
                    ]}>
                    {t(`register.phoneOperators.${code}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
