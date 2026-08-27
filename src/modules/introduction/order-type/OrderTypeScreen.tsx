import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { useKioskSession } from '@shared/session';
import { resolveKioskImageUrl, type KioskOrderTypeChoice } from '@shared/api/kiosk';
import { kioskScreenLayout } from '@shared/theme';

import { HeroSelectionCard } from '../components';
import { orderTypeCompactLayout, orderTypeLayout } from './theme';
import { useOrderTypeSelection } from './hooks';

type OrderTypeScreenProps = {
  onContinue: (choice: KioskOrderTypeChoice) => void;
  onBack: () => void;
};

export function OrderTypeScreen({ onContinue, onBack }: OrderTypeScreenProps) {
  const { t } = useTranslation('introduction');
  const { runtimeConfig } = useKioskSession();
  const { selectOrderType } = useOrderTypeSelection({ onContinue });
  const choices = runtimeConfig?.orderTypeChoices ?? [];
  // El layout original es de alto fijo y entra justo con dos opciones. Con tres se
  // usa la variante compacta para que las tres queden a la vista sin scrollear
  // (el panel no deja configurar más de 3).
  const compact = choices.length > 2;

  return (
    <KioskScreenLayout
      testID="introduction-order-type"
      showPattern
      contentAlign="top"
      onBack={onBack}
      title={t('orderType.title')}
      subtitle={t('orderType.subtitle')}
      contentStyle={styles.content}>
      <View style={[styles.options, compact && styles.optionsCompact]}>
        {choices.map((choice) => (
          <HeroSelectionCard
            key={choice.id}
            // El par de fábrica se traduce; las etiquetas que carga el negocio se
            // muestran tal cual (no hay traducción por opción, es a propósito).
            label={choice.label ?? t(`orderType.${choice.labelKey ?? 'dineIn'}`)}
            imageVariant={choice.imageVariant}
            imageUrl={resolveKioskImageUrl(choice.image)}
            testID={`order-type-${choice.id}`}
            compact={compact}
            onPress={() => selectOrderType(choice)}
          />
        ))}
      </View>
    </KioskScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: kioskScreenLayout.optionsBottomPadding,
  },
  options: {
    width: '100%',
    alignItems: 'center',
    gap: orderTypeLayout.optionsGap,
  },
  optionsCompact: {
    gap: orderTypeCompactLayout.optionsGap,
  },
});
