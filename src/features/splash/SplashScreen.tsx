import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { palette, spacing } from '../../constants/theme';
import { fileService } from '../../services/file/fileService';
import { RootStackParamList } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const mark = require('../../assets/branding/kaagaz-mark.png');

export function SplashScreen({ navigation }: Props) {
  const backgroundReveal = useSharedValue(0);
  const cardReveal = useSharedValue(0);
  const markReveal = useSharedValue(0);
  const wordReveal = useSharedValue(0);
  const captionReveal = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    const startedAt = Date.now();

    backgroundReveal.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.quad),
    });
    cardReveal.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    markReveal.value = withDelay(
      50,
      withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      }),
    );
    wordReveal.value = withDelay(
      120,
      withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      }),
    );
    captionReveal.value = withDelay(
      220,
      withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      }),
    );

    fileService.prepareWorkspace().finally(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 980 - elapsed);
      setTimeout(() => {
        if (mounted) {
          navigation.replace('MainTabs');
        }
      }, remaining);
    });

    return () => {
      mounted = false;
    };
  }, [backgroundReveal, captionReveal, cardReveal, markReveal, navigation, wordReveal]);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(backgroundReveal.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(backgroundReveal.value, [0, 1], [0.86, 1]) }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardReveal.value,
    transform: [
      { translateY: interpolate(cardReveal.value, [0, 1], [24, 0]) },
      { scale: interpolate(cardReveal.value, [0, 1], [0.94, 1]) },
    ],
  }));

  const markStyle = useAnimatedStyle(() => ({
    opacity: markReveal.value,
    transform: [
      { translateY: interpolate(markReveal.value, [0, 1], [12, 0]) },
      { scale: interpolate(markReveal.value, [0, 1], [0.85, 1]) },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordReveal.value,
    transform: [{ translateY: interpolate(wordReveal.value, [0, 1], [14, 0]) }],
  }));

  const captionStyle = useAnimatedStyle(() => ({
    opacity: captionReveal.value,
    transform: [{ translateY: interpolate(captionReveal.value, [0, 1], [10, 0]) }],
  }));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <StatusBar backgroundColor={palette.brandPaper} barStyle="dark-content" />

      <Animated.View style={[styles.orb, styles.orbLeft, orbStyle]} />
      <Animated.View style={[styles.orb, styles.orbRight, orbStyle]} />

      <View style={styles.stage}>
        <Animated.View style={[styles.brandCard, cardStyle]}>
          <Animated.View style={[styles.markPlate, markStyle]}>
            <Image accessible accessibilityLabel="Kaagaz mark" source={mark} style={styles.mark} />
          </Animated.View>

          <Animated.View style={[styles.wordBlock, wordStyle]}>
            <Text style={styles.wordmark}>Kaagaz</Text>
            <Text style={styles.tagline}>Offline document workbench</Text>
          </Animated.View>
        </Animated.View>

        <Animated.Text style={[styles.caption, captionStyle]}>
          Scan, save, and print locally
        </Animated.Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.brandPaper,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: palette.accentSoft,
  },
  orbLeft: {
    width: 220,
    height: 220,
    top: 88,
    left: -48,
  },
  orbRight: {
    width: 168,
    height: 168,
    bottom: 120,
    right: -30,
  },
  brandCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
    shadowColor: '#11262A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 32,
    elevation: 5,
  },
  markPlate: {
    width: 94,
    height: 94,
    borderRadius: 28,
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1,
    borderColor: palette.separator,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  mark: {
    width: 68,
    height: 68,
    resizeMode: 'contain',
  },
  wordBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  wordmark: {
    fontFamily: 'sans-serif-medium',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    color: palette.brandTeal,
    letterSpacing: -0.7,
  },
  tagline: {
    fontFamily: 'sans-serif-medium',
    fontSize: 12,
    lineHeight: 16,
    color: palette.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  caption: {
    marginTop: spacing.xl,
    fontFamily: 'sans-serif',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkMuted,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
