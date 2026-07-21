import { StyleSheet, View } from 'react-native';

import LogoMidaz from '@assets/images/home/logo-midaz.svg';
import { introductionLayout } from '../../theme';

export function MidazLogoMark() {
  return (
    <View style={styles.wrap}>
      <LogoMidaz
        width={introductionLayout.logoWidth}
        height={introductionLayout.logoHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
