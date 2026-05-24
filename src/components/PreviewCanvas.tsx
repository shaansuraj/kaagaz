import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { palette, radii, spacing, typography } from '../constants/theme';
import { PreviewItem, ToolPreviewKind, ToolSelectionMode } from '../types/models';
import { PaperPreview } from './PaperPreview';

type Props = {
  items: PreviewItem[];
  previewKind: ToolPreviewKind;
  selectionMode: ToolSelectionMode;
  focusedId?: string | null;
  selectedIds?: string[];
  onFocus?: (id: string) => void;
  onSelect?: (id: string) => void;
};

function isSelected(id: string, selectedIds?: string[]) {
  return !!selectedIds?.includes(id);
}

export function PreviewCanvas({
  items,
  previewKind,
  selectionMode,
  focusedId,
  selectedIds,
  onFocus,
  onSelect,
}: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No preview yet</Text>
        <Text style={styles.emptyBody}>
          Choose files to see pages and images here before you run the tool.
        </Text>
      </View>
    );
  }

  const focused = items.find((item) => item.id === focusedId) ?? items[0];

  if (previewKind === 'compare' || previewKind === 'filmstrip') {
    return (
      <View style={styles.focusLayout}>
        <PaperPreview
          imagePath={focused.fullPreviewPath ?? focused.thumbnailPath}
          aspectRatio={
            focused.rotationDeg % 180 === 0
              ? focused.width / Math.max(focused.height, 1)
              : focused.height / Math.max(focused.width, 1)
          }
          rotationDeg={focused.rotationDeg}
          label={focused.sourceLabel}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filmstrip}>
          {items.map((item) => (
            <PreviewThumb
              key={item.id}
              item={item}
              active={focused.id === item.id}
              selected={isSelected(item.id, selectedIds)}
              selectionMode={selectionMode}
              onPress={() => onFocus?.(item.id)}
              onSelect={() => onSelect?.(item.id)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (previewKind === 'document-stack') {
    return (
      <View style={styles.documentStack}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onFocus?.(item.id)}
            style={[
              styles.documentCard,
              focused.id === item.id && styles.documentCardActive,
            ]}>
            <View style={styles.documentPreview}>
              <PaperPreview
                imagePath={item.thumbnailPath ?? item.fullPreviewPath}
                aspectRatio={
                  item.rotationDeg % 180 === 0
                    ? item.width / Math.max(item.height, 1)
                    : item.height / Math.max(item.width, 1)
                }
                rotationDeg={item.rotationDeg}
                compact
                label={item.sourceLabel}
              />
            </View>
            <View style={styles.documentCopy}>
              <Text numberOfLines={1} style={styles.documentTitle}>
                {item.parentSourceName ?? item.sourceLabel ?? 'PDF document'}
              </Text>
              <Text style={styles.documentMeta}>
                {item.pageNumber ? `Starts at page ${item.pageNumber}` : 'PDF source'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <PreviewThumb
          key={item.id}
          item={item}
          active={focused.id === item.id}
          selected={isSelected(item.id, selectedIds)}
          selectionMode={selectionMode}
          onPress={() => onFocus?.(item.id)}
          onSelect={() => onSelect?.(item.id)}
          grid
        />
      ))}
    </View>
  );
}

function PreviewThumb({
  item,
  active,
  selected,
  selectionMode,
  onPress,
  onSelect,
  grid = false,
}: {
  item: PreviewItem;
  active: boolean;
  selected: boolean;
  selectionMode: ToolSelectionMode;
  onPress: () => void;
  onSelect: () => void;
  grid?: boolean;
}) {
  const canSelect = selectionMode !== 'none';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.thumb, grid ? styles.gridThumb : styles.filmThumb, active && styles.thumbActive]}>
      <PaperPreview
        imagePath={item.thumbnailPath ?? item.fullPreviewPath}
        aspectRatio={
          item.rotationDeg % 180 === 0
            ? item.width / Math.max(item.height, 1)
            : item.height / Math.max(item.width, 1)
        }
        rotationDeg={item.rotationDeg}
        compact
        label={item.sourceLabel}
      />
      <View style={styles.thumbFooter}>
        <Text numberOfLines={1} style={styles.thumbLabel}>
          {item.sourceLabel ?? `Page ${item.pageNumber ?? 1}`}
        </Text>
        {canSelect ? (
          <Pressable accessibilityRole="button" onPress={onSelect} style={styles.checkButton}>
            <MaterialCommunityIcons
              color={selected ? palette.accent : palette.inkMuted}
              name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
  },
  emptyBody: {
    ...typography.body,
  },
  focusLayout: {
    gap: spacing.md,
  },
  filmstrip: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  documentStack: {
    gap: spacing.md,
  },
  documentCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    alignItems: 'center',
  },
  documentCardActive: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.surfaceSoft,
  },
  documentPreview: {
    width: 82,
  },
  documentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  documentTitle: {
    ...typography.bodyStrong,
  },
  documentMeta: {
    ...typography.small,
  },
  thumb: {
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  thumbActive: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.surfaceSoft,
  },
  filmThumb: {
    width: 132,
  },
  gridThumb: {
    width: '47%',
  },
  thumbFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thumbLabel: {
    ...typography.small,
    flex: 1,
    color: palette.ink,
  },
  checkButton: {
    padding: 2,
  },
});
