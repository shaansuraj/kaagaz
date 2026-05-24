import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { palette, radii, spacing, typography } from '../constants/theme';
import { PaperPreview } from './PaperPreview';

type Props = {
  title: string;
  meta: string;
  badges?: string[];
  onPress: () => void;
  secondaryText?: string;
  thumbnailPath?: string | null;
  thumbnailAspectRatio?: number;
};

export function DocumentRow({
  title,
  meta,
  badges = [],
  onPress,
  secondaryText,
  thumbnailPath,
  thumbnailAspectRatio = 0.72,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {thumbnailPath ? (
        <View style={styles.previewWrap}>
          <PaperPreview
            imagePath={thumbnailPath}
            aspectRatio={thumbnailAspectRatio}
            compact
          />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={2} style={styles.meta}>
          {meta}
        </Text>
        {badges.length > 0 ? (
          <View style={styles.badges}>
            {badges.map((badge) => (
              <View key={badge} style={styles.badge}>
                <Text style={styles.badgeLabel}>{badge}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {secondaryText ? <Text style={styles.secondaryText}>{secondaryText}</Text> : null}
        <View style={styles.chevronWrap}>
          <MaterialCommunityIcons color={palette.accent} name="chevron-right" size={18} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 84,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  previewWrap: {
    width: 60,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyStrong,
  },
  meta: {
    ...typography.small,
    color: palette.inkSoft,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surface,
  },
  badgeLabel: {
    ...typography.label,
    color: palette.inkSoft,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
    minWidth: 48,
  },
  secondaryText: {
    ...typography.small,
    textAlign: 'right',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
