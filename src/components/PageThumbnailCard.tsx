import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { palette, radii, spacing, typography } from '../constants/theme';
import { ScannedPage } from '../types/models';
import { PaperPreview } from './PaperPreview';

type Props = {
  page: ScannedPage;
  index: number;
  onDelete?: () => void;
};

export function PageThumbnailCard({ page, index, onDelete }: Props) {
  const statusLabel =
    page.processingStatus === 'processing' || page.processingStatus === 'pending'
      ? 'Processing'
      : page.processingStatus === 'failed'
        ? 'Needs retry'
        : 'Ready';

  return (
    <View style={styles.row}>
      <View style={styles.previewWrap}>
        <PaperPreview
          imagePath={page.thumbnailPath || page.processedImagePath}
          aspectRatio={page.aspectRatio}
          compact
        />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pageLabel}>Page {index + 1}</Text>
          <Text style={styles.meta}>{page.filterMode === 'bw' ? 'Black & White' : 'Color'}</Text>
        </View>
        <Text style={styles.title}>{statusLabel}</Text>
        <Text style={styles.meta}>
          {page.width} x {page.height}
        </Text>
      </View>
      {onDelete ? (
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons color={palette.danger} name="trash-can-outline" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  previewWrap: {
    width: 86,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'center',
  },
  pageLabel: {
    ...typography.bodyStrong,
  },
  title: {
    ...typography.small,
    color: palette.ink,
  },
  meta: {
    ...typography.small,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.separator,
  },
});
