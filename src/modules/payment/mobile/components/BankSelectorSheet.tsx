import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useCustomerRegisterFieldStyles } from '@modules/customer/customer-register/theme/customerRegisterFieldStyles';
import { filterBanks, type KioskBank } from '@shared/api/kiosk';
import {
  displayTextStyle,
  kioskScreenLayout,
  mediumTextStyle,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type BankSelectorSheetProps = {
  visible: boolean;
  banks: KioskBank[];
  selectedCode?: string;
  onClose: () => void;
  onSelect: (bank: KioskBank) => void;
};

export function BankSelectorSheet({
  visible,
  banks,
  selectedCode,
  onClose,
  onSelect,
}: BankSelectorSheetProps) {
  const { t } = useTranslation('payment');
  const colors = useKioskScreenColors();
  const fieldStyles = useCustomerRegisterFieldStyles();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => filterBanks(banks, query), [banks, query]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(30, 41, 59, 0.45)',
          justifyContent: 'flex-end',
        },
        sheet: {
          maxHeight: '75%',
          backgroundColor: colors.cardBackground,
          borderTopLeftRadius: kioskScreenLayout.cartCheckoutRadius,
          borderTopRightRadius: kioskScreenLayout.cartCheckoutRadius,
          borderWidth: kioskScreenLayout.paymentReferenceInputBorderWidth,
          borderColor: colors.paymentReferenceInputBorder,
          paddingHorizontal: kioskScreenLayout.cartCheckoutPadding,
          paddingTop: kioskScreenLayout.cartCheckoutPaddingTop,
          paddingBottom: kioskScreenLayout.cartCheckoutPadding,
          gap: kioskScale(20),
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceInputLabelSize,
          lineHeight: kioskScreenLayout.paymentReferenceInputLabelLineHeight,
          color: colors.title,
          textAlign: 'center',
        },
        searchInput: {
          ...fieldStyles.input,
          fontSize: kioskScreenLayout.paymentReferenceInputLabelSize * 0.85,
        },
        list: {
          flexGrow: 0,
        },
        item: {
          minHeight: kioskScale(72),
          borderRadius: kioskScale(16),
          borderWidth: kioskScale(2),
          borderColor: colors.paymentReferenceInputBorder,
          backgroundColor: colors.screenBackground,
          paddingHorizontal: kioskScale(20),
          paddingVertical: kioskScale(12),
          marginBottom: kioskScale(12),
          justifyContent: 'center',
        },
        itemSelected: {
          backgroundColor: colors.modifierSelectedBg,
          borderColor: colors.priceAccent,
        },
        itemCode: {
          ...mediumTextStyle(),
          fontSize: kioskScale(26),
          color: colors.menuSectionMuted,
        },
        itemName: {
          ...displayTextStyle(),
          fontSize: kioskScale(28),
          color: colors.title,
        },
        empty: {
          ...mediumTextStyle(),
          fontSize: kioskScale(28),
          color: colors.menuSectionMuted,
          textAlign: 'center',
          paddingVertical: kioskScale(24),
        },
      }),
    [colors, fieldStyles],
  );

  const handleSelect = useCallback(
    (bank: KioskBank) => {
      setQuery('');
      onSelect(bank);
      onClose();
    },
    [onClose, onSelect],
  );

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={t('mobile.bankSheet.closeA11y')}
          onPress={handleClose}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('mobile.bankSheet.title')}</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('mobile.bankSheet.searchPlaceholder')}
            placeholderTextColor={colors.menuSectionMuted}
            autoCapitalize="none"
            autoCorrect={false}
            testID="payment-bank-sheet-search"
          />
          <FlatList
            style={styles.list}
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>{t('mobile.bankSheet.empty')}</Text>
            }
            renderItem={({ item }) => {
              const selected = item.code === selectedCode;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleSelect(item)}
                  style={[styles.item, selected && styles.itemSelected]}
                  testID={`payment-bank-option-${item.code}`}>
                  <Text style={styles.itemCode}>{item.code}</Text>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
