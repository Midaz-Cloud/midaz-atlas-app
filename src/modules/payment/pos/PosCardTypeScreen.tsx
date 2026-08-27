import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { kioskScreenLayout } from '@shared/theme';
import type { CardKind } from '@shared/kiosk-order';

import { PaymentMethodCard } from '../payment-method/components';

export type PosCardTypeScreenProps = {
  onBack: () => void;
  onSelect: (kind: CardKind) => void;
  selected?: CardKind | null;
};

/**
 * Débito o crédito, después de "Punto de venta".
 *
 * Es la única fuente confiable del tipo de tarjeta: Nexgo no documenta qué
 * significa el `accountType` que devuelve el terminal, así que antes se
 * facturaba TODO como débito (catalogo11 05) aunque se pagara con crédito.
 */
export function PosCardTypeScreen({ onBack, onSelect, selected }: PosCardTypeScreenProps) {
  const { t } = useTranslation('payment');

  return (
    <KioskScreenLayout
      testID="payment-pos-card-type"
      showPattern
      contentAlign="top"
      onBack={onBack}
      backButtonTestID="payment-pos-card-type-back"
      title={t('cardType.title')}
      subtitle={t('cardType.subtitle')}
      contentStyle={styles.content}>
      <View style={styles.list}>
        <PaymentMethodCard
          methodId="pos"
          testID="payment-pos-card-type-debito"
          title={t('cardType.debito.title')}
          description={t('cardType.debito.description')}
          selected={selected === 'debito'}
          onPress={() => onSelect('debito')}
        />
        <PaymentMethodCard
          methodId="pos"
          testID="payment-pos-card-type-credito"
          title={t('cardType.credito.title')}
          description={t('cardType.credito.description')}
          selected={selected === 'credito'}
          onPress={() => onSelect('credito')}
        />
      </View>
    </KioskScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: kioskScreenLayout.optionsBottomPadding,
  },
  list: {
    gap: kioskScreenLayout.paymentMethodListGap,
  },
});
