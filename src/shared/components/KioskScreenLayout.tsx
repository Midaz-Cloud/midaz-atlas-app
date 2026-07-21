import { useMemo, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CreamScreenPattern from '@assets/images/kiosk/cream-screen-pattern.svg';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { BackButton } from './BackButton';
import { KioskStepHeader } from './KioskStepHeader';

type KioskScreenLayoutContentAlign = 'top' | 'center';

type KioskScreenLayoutProps = {
  children: ReactNode;
  testID?: string;
  showPattern?: boolean;
  onBack?: () => void;
  backButtonTestID?: string;
  title?: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  contentAlign?: KioskScreenLayoutContentAlign;
  contentStyle?: StyleProp<ViewStyle>;
};

export function KioskScreenLayout({
  children,
  testID,
  showPattern = true,
  onBack,
  backButtonTestID,
  title,
  subtitle,
  headerExtra,
  contentAlign = 'top',
  contentStyle,
}: KioskScreenLayoutProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const hasStepHeader = Boolean(title ?? subtitle);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        pattern: {
          ...StyleSheet.absoluteFill,
        },
        frame: {
          flex: 1,
        },
        backRow: {
          marginBottom: kioskScale(24),
        },
        content: {
          flex: 1,
        },
        body: {
          flex: 1,
        },
        bodyCentered: {
          justifyContent: 'center',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.root} testID={testID}>
      {showPattern ? (
        <View style={styles.pattern} pointerEvents="none">
          <CreamScreenPattern
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
          />
        </View>
      ) : null}

      <View
        style={[
          styles.frame,
          {
            paddingTop: insets.top + kioskScreenLayout.headerPaddingVertical,
            paddingBottom: insets.bottom + kioskScreenLayout.headerPaddingVertical,
            paddingHorizontal: kioskScreenLayout.horizontalPadding,
          },
        ]}>
        {onBack ? (
          <View style={styles.backRow}>
            <BackButton onPress={onBack} testID={backButtonTestID} />
          </View>
        ) : null}

        {headerExtra}

        <View style={styles.content}>
          {hasStepHeader ? (
            <KioskStepHeader title={title ?? ''} subtitle={subtitle ?? ''} />
          ) : null}
          <View
            style={[
              styles.body,
              contentAlign === 'center' && styles.bodyCentered,
              contentStyle,
            ]}>
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}
