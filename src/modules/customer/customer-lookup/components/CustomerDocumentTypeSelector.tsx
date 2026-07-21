import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CustomerDocumentType } from '@shared/api/kiosk';
import { CUSTOMER_DOCUMENT_TYPES } from '@shared/api/kiosk';
import {
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type CustomerDocumentTypeSelectorProps = {
  value: CustomerDocumentType;
  onChange: (type: CustomerDocumentType) => void;
};

const TRIGGER_MIN_HEIGHT =
  kioskScreenLayout.paymentReferenceInputPaddingVertical * 2 + kioskScale(56);

export function CustomerDocumentTypeSelector({
  value,
  onChange,
}: CustomerDocumentTypeSelectorProps) {
  const { t } = useTranslation('customer');
  const colors = useKioskScreenColors();
  const [open, setOpen] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trigger: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: kioskScale(180),
          minHeight: TRIGGER_MIN_HEIGHT,
          paddingHorizontal: kioskScreenLayout.paymentReferenceInputPaddingHorizontal,
          paddingVertical: kioskScreenLayout.paymentReferenceInputPaddingVertical,
          borderRadius: kioskScreenLayout.paymentReferenceInputRadius,
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScreenLayout.paymentReferenceInputBorderWidth,
          borderColor: colors.paymentReferenceInputBorder,
          gap: kioskScale(16),
        },
        triggerValue: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceDigitsSize,
          lineHeight: kioskScreenLayout.paymentReferenceDigitsSize * 1.15,
          color: colors.title,
        },
        chevron: {
          ...displayTextStyle(),
          fontSize: kioskScale(28),
          color: colors.menuSectionMuted,
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
        },
        menuItemSelected: {
          backgroundColor: colors.modifierSelectedBg,
          borderColor: colors.priceAccent,
        },
        menuItemLabel: {
          ...displayTextStyle(),
          fontSize: kioskScale(56),
          lineHeight: kioskScale(64),
          color: colors.menuSectionMuted,
        },
        menuItemLabelSelected: {
          color: colors.title,
        },
      }),
    [colors],
  );

  const close = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (type: CustomerDocumentType) => {
      onChange(type);
      close();
    },
    [close, onChange],
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Tipo de documento ${value}`}
        onPress={() => setOpen(true)}
        style={styles.trigger}
        testID="customer-document-type-selector">
        <Text style={styles.triggerValue}>{value}</Text>
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
            accessibilityLabel={t('lookup.documentTypeClose')}
            onPress={close}
          />
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{t('lookup.documentTypeTitle')}</Text>
            {CUSTOMER_DOCUMENT_TYPES.map((type) => {
              const selected = type === value;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleSelect(type)}
                  style={[styles.menuItem, selected && styles.menuItemSelected]}
                  testID={`customer-document-type-${type}`}>
                  <Text
                    style={[styles.menuItemLabel, selected && styles.menuItemLabelSelected]}>
                    {type}
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
