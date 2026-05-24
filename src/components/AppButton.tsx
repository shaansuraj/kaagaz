import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { palette, radii, spacing, typography } from '../constants/theme';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: Tone;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function AppButton({
  title,
  onPress,
  disabled,
  loading,
  tone = 'primary',
  size = 'md',
  icon,
  fullWidth = true,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        toneStyles[tone],
        fullWidth ? styles.fullWidth : styles.autoWidth,
        style,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading ? pressedStyles[tone] : null,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={tone === 'primary' || tone === 'secondary' ? palette.white : palette.accent}
        />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, labelSizeStyles[size], toneTextStyles[tone]]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyStrong,
    letterSpacing: 0.1,
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
});

const labelSizeStyles = StyleSheet.create({
  sm: {
    fontSize: 14,
    lineHeight: 18,
  },
  md: {
    fontSize: 15,
    lineHeight: 20,
  },
  lg: {
    fontSize: 16,
    lineHeight: 21,
  },
});

const toneStyles = StyleSheet.create({
  primary: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  secondary: {
    backgroundColor: palette.accentSecondary,
    borderColor: palette.accentSecondary,
  },
  tertiary: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  danger: {
    backgroundColor: '#FFF4F3',
    borderColor: '#EACACA',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.separator,
  },
});

const toneTextStyles = StyleSheet.create({
  primary: {
    color: palette.white,
  },
  secondary: {
    color: palette.white,
  },
  tertiary: {
    color: palette.ink,
  },
  danger: {
    color: palette.danger,
  },
  ghost: {
    color: palette.accent,
  },
});

const pressedStyles = StyleSheet.create({
  primary: {
    backgroundColor: palette.accentPressed,
    borderColor: palette.accentPressed,
  },
  secondary: {
    backgroundColor: '#0B5B63',
    borderColor: '#0B5B63',
  },
  tertiary: {
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.borderStrong,
  },
  danger: {
    backgroundColor: '#FFEAEA',
  },
  ghost: {
    backgroundColor: palette.surface,
  },
});
