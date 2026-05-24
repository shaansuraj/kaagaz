import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { palette, radii, spacing, typography } from '../constants/theme';

type Variant = 'default' | 'accent' | 'subtle' | 'outline';
type Padding = 'md' | 'lg';

type Props = {
  title?: string;
  caption?: string;
  eyebrow?: string;
  headerAccessory?: ReactNode;
  children: ReactNode;
  variant?: Variant;
  padding?: Padding;
  style?: ViewStyle;
};

export function SectionCard({
  title,
  caption,
  eyebrow,
  headerAccessory,
  children,
  variant = 'default',
  padding = 'lg',
  style,
}: Props) {
  return (
    <View style={[styles.card, variantStyles[variant], paddingStyles[padding], style]}>
      {title || caption || eyebrow || headerAccessory ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
          </View>
          {headerAccessory ? <View>{headerAccessory}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.xl,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: palette.accent,
  },
  title: {
    ...typography.subtitle,
  },
  caption: {
    ...typography.small,
    color: palette.inkMuted,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: palette.surface,
    borderColor: palette.separator,
  },
  accent: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentStrong,
  },
  subtle: {
    backgroundColor: palette.surfaceSoft,
    borderColor: palette.separator,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: palette.borderStrong,
  },
});

const paddingStyles = StyleSheet.create({
  md: {
    padding: spacing.md,
  },
  lg: {
    padding: spacing.xl,
  },
});
