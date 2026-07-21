import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { useKioskAppearance } from '@shared/session';
import { kioskScreenLayout } from '@shared/theme';

import { HeroSelectionCard } from '../components';
import { orderTypeLayout } from './theme';
import type { OrderType } from '../types';
import { useOrderTypeSelection } from './hooks';

type OrderTypeScreenProps = {
  onContinue: (orderType: OrderType) => void;
  onBack: () => void;
};

export function OrderTypeScreen({ onContinue, onBack }: OrderTypeScreenProps) {
  const { t } = useTranslation('introduction');
  const appearance = useKioskAppearance();
  const { selectOrderType } = useOrderTypeSelection({ onContinue });

  return (
    <KioskScreenLayout
      testID="introduction-order-type"
      showPattern
      contentAlign="top"
      onBack={onBack}
      title={t('orderType.title')}
      subtitle={t('orderType.subtitle')}
      contentStyle={styles.content}>
      <View style={styles.options}>
        <HeroSelectionCard
          label={t('orderType.dineIn')}
          imageVariant="dineIn"
          imageUrl={appearance?.inStoreImageUrl}
          testID="order-type-dine-in"
          onPress={() => selectOrderType('dineIn')}
        />
        <HeroSelectionCard
          label={t('orderType.takeOut')}
          imageVariant="takeOut"
          imageUrl={appearance?.pickupImageUrl}
          testID="order-type-take-out"
          onPress={() => selectOrderType('takeOut')}
        />
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
});
