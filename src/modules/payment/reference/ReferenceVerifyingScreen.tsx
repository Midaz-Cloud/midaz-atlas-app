import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';

import { PaymentStatusIllustration } from '../components/PaymentStatusIllustration';
import { referenceFlowLayoutStyles } from './referenceFlowLayout';

/** P12 · Verificando (Figma 51:53). Sin back activo. */
export function ReferenceVerifyingScreen() {
  const { t } = useTranslation('payment');

  return (
    <KioskScreenLayout
      testID="payment-reference-verifying-screen"
      showPattern
      contentAlign="center"
      contentStyle={referenceFlowLayoutStyles.content}>
      <View style={referenceFlowLayoutStyles.inner}>
        <PaymentStatusIllustration
          variant="verifying"
          title={t('reference.verifying.title')}
          subtitle={t('reference.verifying.subtitle')}
          dontCloseLabel={t('reference.verifying.dontClose')}
        />
      </View>
    </KioskScreenLayout>
  );
}
