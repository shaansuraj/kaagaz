import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing, typography } from '../constants/theme';

type Props = {
  children: ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
};

type HeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
};

export function Screen({
  children,
  contentStyle,
  scroll = true,
  header,
  footer,
}: Props) {
  const content = <View style={[styles.inner, contentStyle]}>{children}</View>;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          {header ? <View style={styles.header}>{header}</View> : null}
          {scroll ? (
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {content}
            </ScrollView>
          ) : (
            <View style={styles.flex}>{content}</View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      {footer ? (
        <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
          <View style={styles.footer}>{footer}</View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

export function ScreenHeader({ eyebrow, title, subtitle, accessory }: HeaderProps) {
  return (
    <View style={styles.headerBlock}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: palette.canvas,
  },
  headerBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  accessory: {
    alignSelf: 'flex-start',
  },
  eyebrow: {
    ...typography.label,
    color: palette.accent,
  },
  title: {
    ...typography.display,
  },
  subtitle: {
    ...typography.body,
    color: palette.inkSoft,
    maxWidth: 560,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  footerSafeArea: {
    backgroundColor: palette.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: palette.canvas,
  },
});
