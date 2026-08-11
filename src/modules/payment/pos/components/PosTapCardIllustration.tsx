import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { brand, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type PosTapCardIllustrationProps = {
  /** Short cue under the device frame (e.g. "Acerca o ingresa tu tarjeta"). */
  instruction?: string;
};

/**
 * CSS-like POS bezel + contactless waves + looping card approach animation
 * (inspired by repo root logo.html — without using a terminal photo).
 * Frame / NFC / antennas use org primary (`priceAccent` from kiosk appearance).
 */
export function PosTapCardIllustration({ instruction }: PosTapCardIllustrationProps) {
  const colors = useKioskScreenColors();
  const primary = colors.priceAccent;

  const cardProgress = useRef(new Animated.Value(0)).current;
  const nfcPulse = useRef(new Animated.Value(0.45)).current;
  const antennaPulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const cardLoop = Animated.loop(
      Animated.timing(cardProgress, {
        toValue: 1,
        duration: 3000,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }),
    );
    cardLoop.start();

    const pulse = (value: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(value, {
            toValue: 1,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.45,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const nfc = pulse(nfcPulse, 0);
    const antennas = pulse(antennaPulse, 250);
    nfc.start();
    antennas.start();

    return () => {
      cardLoop.stop();
      nfc.stop();
      antennas.stop();
    };
  }, [antennaPulse, cardProgress, nfcPulse]);

  const styles = useMemo(() => createStyles(primary, colors.title), [primary, colors.title]);
  const sideStyles = useMemo(() => createSideStyles(primary), [primary]);

  const cardTranslateX = cardProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [kioskScale(150), 0, 0],
  });
  const cardTranslateY = cardProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [kioskScale(180), 0, 0],
  });
  const cardRotate = cardProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: ['15deg', '0deg', '0deg'],
  });
  const cardScale = cardProgress.interpolate({
    inputRange: [0, 0.45, 0.5, 1],
    outputRange: [1.2, 1, 0.95, 0.95],
  });
  const cardOpacity = cardProgress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });
  const nfcScale = nfcPulse.interpolate({
    inputRange: [0.45, 1],
    outputRange: [1, 1.08],
  });

  return (
    <View style={styles.root} testID="payment-pos-tap-illustration">
      <View style={styles.bezel}>
        <View style={styles.cameraDot} />
        <View style={styles.screen}>
          <Animated.View
            style={[styles.sideAntenna, { opacity: antennaPulse }]}
            pointerEvents="none">
            <SideAntennaWaves styles={sideStyles} />
            <View style={styles.antennaPill} />
            <SideAntennaWaves styles={sideStyles} flip />
          </Animated.View>
          <Animated.View
            style={[styles.sideAntenna, styles.sideAntennaRight, { opacity: antennaPulse }]}
            pointerEvents="none">
            <SideAntennaWaves styles={sideStyles} />
            <View style={styles.antennaPill} />
            <SideAntennaWaves styles={sideStyles} flip />
          </Animated.View>

          <View style={styles.stage}>
            <View style={styles.nfcCircle}>
              <Animated.View
                style={{
                  opacity: nfcPulse,
                  transform: [{ scale: nfcScale }],
                }}>
                <ContactlessSymbol />
              </Animated.View>
            </View>

            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [
                    { translateX: cardTranslateX },
                    { translateY: cardTranslateY },
                    { rotate: cardRotate },
                    { scale: cardScale },
                  ],
                },
              ]}>
              <View style={styles.cardInner}>
                <View style={styles.cardTopRow}>
                  <View style={styles.chip} />
                  <View style={styles.cardLogoDot} />
                </View>
                <View style={styles.cardLines}>
                  <View style={styles.cardLine} />
                  <View style={[styles.cardLine, styles.cardLineShort]} />
                </View>
              </View>
            </Animated.View>
          </View>
        </View>
      </View>
      {instruction ? (
        <Text style={styles.instruction} testID="payment-pos-tap-instruction">
          {instruction}
        </Text>
      ) : null}
    </View>
  );
}

function ContactlessSymbol() {
  const size = kioskScale(56);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 18.5c1.1-2.6 1.1-5.4 0-8"
        stroke={brand.white}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
      <Path
        d="M15 21.5c2.2-5.2 2.2-10.8 0-16"
        stroke={brand.white}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.8}
      />
      <Path
        d="M18 24.5c3.3-7.8 3.3-16.2 0-24"
        stroke={brand.white}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

type SideStyleSheet = ReturnType<typeof createSideStyles>;

function SideAntennaWaves({
  flip,
  styles,
}: {
  flip?: boolean;
  styles: SideStyleSheet;
}) {
  return (
    <View style={[styles.sideWaves, flip ? styles.sideWavesFlip : null]}>
      <View style={[styles.sideArc, styles.sideArcSm]} />
      <View style={[styles.sideArc, styles.sideArcMd]} />
      <View style={[styles.sideArc, styles.sideArcLg]} />
    </View>
  );
}

function createSideStyles(primary: string) {
  return StyleSheet.create({
    sideWaves: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      marginVertical: 4,
    },
    sideWavesFlip: {
      transform: [{ rotate: '180deg' }],
    },
    sideArc: {
      borderColor: primary,
      borderTopWidth: 0,
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    sideArcSm: { width: 10, height: 6 },
    sideArcMd: { width: 14, height: 8 },
    sideArcLg: { width: 18, height: 10 },
  });
}

function createStyles(primary: string, titleColor: string) {
  const cardW = kioskScale(128);
  const cardH = kioskScale(80);
  return StyleSheet.create({
    root: {
      alignItems: 'center',
      gap: kioskScale(16),
    },
    bezel: {
      width: kioskScale(340),
      height: kioskScale(280),
      borderRadius: kioskScale(28),
      backgroundColor: primary,
      padding: kioskScale(14),
      paddingTop: kioskScale(22),
      alignItems: 'center',
      borderWidth: kioskScale(3),
      borderColor: primary,
      shadowColor: titleColor,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    cameraDot: {
      position: 'absolute',
      top: kioskScale(8),
      width: kioskScale(10),
      height: kioskScale(10),
      borderRadius: kioskScale(5),
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.45)',
    },
    screen: {
      flex: 1,
      width: '100%',
      borderRadius: kioskScale(14),
      backgroundColor: brand.cream,
      borderWidth: kioskScale(2),
      borderColor: primary,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sideAntenna: {
      position: 'absolute',
      left: kioskScale(10),
      top: '50%',
      marginTop: kioskScale(-48),
      alignItems: 'center',
      zIndex: 1,
    },
    sideAntennaRight: {
      left: undefined,
      right: kioskScale(10),
    },
    antennaPill: {
      width: kioskScale(14),
      height: kioskScale(56),
      borderRadius: kioskScale(8),
      borderWidth: kioskScale(2),
      borderColor: primary,
      backgroundColor: 'transparent',
    },
    stage: {
      width: kioskScale(220),
      height: kioskScale(180),
      alignItems: 'center',
      justifyContent: 'center',
    },
    nfcCircle: {
      width: kioskScale(88),
      height: kioskScale(88),
      borderRadius: kioskScale(44),
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    card: {
      position: 'absolute',
      width: cardW,
      height: cardH,
      zIndex: 2,
    },
    cardInner: {
      flex: 1,
      borderRadius: kioskScale(12),
      padding: kioskScale(12),
      justifyContent: 'space-between',
      backgroundColor: brand.gold,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      shadowColor: brand.amber,
      shadowOpacity: 0.9,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 10,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    chip: {
      width: kioskScale(24),
      height: kioskScale(18),
      borderRadius: kioskScale(3),
      backgroundColor: 'rgba(253, 230, 138, 0.85)',
    },
    cardLogoDot: {
      width: kioskScale(28),
      height: kioskScale(28),
      borderRadius: kioskScale(14),
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    cardLines: {
      gap: kioskScale(6),
    },
    cardLine: {
      height: kioskScale(4),
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.35)',
      width: '100%',
    },
    cardLineShort: {
      width: '66%',
    },
    instruction: {
      color: titleColor,
      fontSize: kioskScale(22),
      lineHeight: kioskScale(28),
      fontWeight: '700',
      textAlign: 'center',
    },
  });
}
