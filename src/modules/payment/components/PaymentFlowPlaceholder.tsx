import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { formatUsdPrice } from '@shared/utils';
import { useKioskOrder } from '@shared/kiosk-order';

import type { PaymentMethodId } from '../types';

export type PaymentFlowPlaceholderProps = {
  methodId: PaymentMethodId;
  onBack: () => void;
};

/** Stub P10 hasta implementar flujos ECR / pago móvil / Zelle. */
export function PaymentFlowPlaceholder({ methodId, onBack }: PaymentFlowPlaceholderProps) {
  const { t } = useTranslation('payment');
  const { totals } = useKioskOrder();
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          flex: 1,
          justifyContent: 'center',
        },
        box: {
          padding: 24,
          alignItems: 'center',
        },
        hint: {
          ...displayTextStyle(),
          fontSize: 32,
          color: colors.menuSectionMuted,
        },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID={`payment-flow-${methodId}`}
      onBack={onBack}
      title={t(`methodSelect.${methodId}.title`)}
      subtitle={formatUsdPrice(totals.totalUsd)}
      contentStyle={styles.content}>
      <View style={styles.box}>
        <Text style={styles.hint}>P10 · Próxima iteración</Text>
      </View>
    </KioskScreenLayout>
  );
}
