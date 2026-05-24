import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { palette, radii, spacing, typography } from '../constants/theme';
import { PreviewItem } from '../types/models';
import { PaperPreview } from './PaperPreview';

type Props = {
  items: PreviewItem[];
  focusedId?: string | null;
  onFocus?: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  renderActions?: (item: PreviewItem) => ReactNode;
  emptyLabel?: string;
};

export function ReorderSurface({
  items,
  focusedId,
  onFocus,
  onReorder,
  renderActions,
  emptyLabel = 'Nothing to arrange yet.',
}: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyLabel}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <DraggableFlatList
      data={items}
      keyExtractor={(item) => item.id}
      onDragEnd={({ data }) => onReorder(data.map((item) => item.id))}
      renderItem={({ item, drag, isActive }: RenderItemParams<PreviewItem>) => (
        <Pressable
          onLongPress={drag}
          onPress={() => onFocus?.(item.id)}
          style={[
            styles.row,
            isActive && styles.dragging,
            focusedId === item.id && styles.rowFocused,
          ]}>
          <View style={styles.previewWrap}>
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
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.title}>
              {item.sourceLabel ?? `Page ${item.pageNumber ?? 1}`}
            </Text>
            <Text style={styles.meta}>
              {item.pageNumber ? `Page ${item.pageNumber}` : 'Selected item'}
            </Text>
          </View>
          <View style={styles.actions}>
            {renderActions ? renderActions(item) : null}
            <MaterialCommunityIcons color={palette.inkMuted} name="drag" size={20} />
          </View>
        </Pressable>
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  emptyState: {
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: radii.md,
    padding: spacing.lg,
    backgroundColor: palette.surface,
  },
  emptyLabel: {
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: palette.surface,
    marginBottom: spacing.sm,
  },
  rowFocused: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.surfaceSoft,
  },
  dragging: {
    opacity: 0.85,
  },
  previewWrap: {
    width: 72,
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
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
