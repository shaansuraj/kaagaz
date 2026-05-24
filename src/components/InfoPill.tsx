import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { palette, radii, spacing, typography } from '../constants/theme';

type Variant = 'default' | 'accent' | 'success' | 'muted';

type Props = {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
};

export function InfoPill({ label, variant = 'default', style }: Props) {
  return (
    <View style={[styles.base, variantStyles[variant], style]}>
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: {
    ...typography.label,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.separator,
  },
  accent: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentStrong,
  },
  success: {
    backgroundColor: '#EAF7F2',
    borderColor: '#C5E6D9',
  },
  muted: {
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.separator,
  },
});

const labelStyles = StyleSheet.create({
  default: {
    color: palette.inkMuted,
  },
  accent: {
    color: palette.accent,
  },
  success: {
    color: palette.success,
  },
  muted: {
    color: palette.machine,
  },
});
