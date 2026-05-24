import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { DocumentRow } from '../../components/DocumentRow';
import { Screen, ScreenHeader } from '../../components/Screen';
import { palette, radii, spacing, typography } from '../../constants/theme';
import { openSavedFile } from '../../services/file/documentActions';
import { useAppStore } from '../../store/useAppStore';
import { MainTabParamList } from '../../types/models';
import { formatDateTime } from '../../utils/date';

type Props = BottomTabScreenProps<MainTabParamList, 'Library'>;

const filters = ['All', 'Scans', 'PDF', 'DOCX', 'Images', 'Compressed', 'Converted'] as const;

export function LibraryScreen(_: Props) {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All');
  const libraryOrder = useAppStore((state) => state.libraryOrder);
  const libraryItemsById = useAppStore((state) => state.libraryItems);
  const documents = useAppStore((state) => state.documents);
  const savedFiles = useAppStore((state) => state.savedFiles);

  const libraryItems = useMemo(
    () =>
      libraryOrder
        .map((id) => libraryItemsById[id])
        .filter(Boolean)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [libraryItemsById, libraryOrder],
  );

  const filteredItems = libraryItems.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
    if (!matchesQuery) {
      return false;
    }

    if (activeFilter === 'All') {
      return true;
    }

    if (activeFilter === 'Scans') {
      return item.sourceTool === 'scanner';
    }

    if (activeFilter === 'PDF') {
      return item.fileIds.some((fileId) => savedFiles[fileId]?.role === 'pdf');
    }

    if (activeFilter === 'DOCX') {
      return item.fileIds.some((fileId) => savedFiles[fileId]?.role === 'docx');
    }

    if (activeFilter === 'Images') {
      return item.fileIds.some((fileId) => savedFiles[fileId]?.role === 'image');
    }

    if (activeFilter === 'Compressed') {
      return item.kind === 'compressed';
    }

    return item.kind === 'converted' || item.kind === 'merged';
  });

  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="Library"
          title="Local files"
          subtitle="Everything Kaagaz created or saved to this device, with focused search and quick re-open."
        />
      }>
      <View style={styles.searchShell}>
        <MaterialCommunityIcons color={palette.inkMuted} name="magnify" size={18} />
        <TextInput
          accessibilityLabel="Search library"
          onChangeText={setQuery}
          placeholder="Search documents and saved files"
          placeholderTextColor={palette.inkMuted}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}>
            <Text
              style={[
                styles.filterLabel,
                activeFilter === filter && styles.filterLabelActive,
              ]}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.listSection}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matching files</Text>
            <Text style={styles.emptyBody}>
              Try another filter or create a new scan from Home.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const scannerDocument = Object.values(documents).find(
              (document) => document.libraryItemId === item.id,
            );
            const badges = [
              item.kind.replace('-', ' '),
              `${item.pageCount} page${item.pageCount === 1 ? '' : 's'}`,
            ];

            return (
              <DocumentRow
                key={item.id}
                title={item.name}
                meta={formatDateTime(item.updatedAt)}
                badges={badges}
                secondaryText={item.sourceTool === 'scanner' ? 'Scan' : 'Tool'}
                thumbnailPath={item.thumbnailPath}
                onPress={async () => {
                  if (scannerDocument) {
                    navigation.navigate('DocumentDetail', { documentId: scannerDocument.id });
                    return;
                  }

                  const firstFile = item.fileIds.map((fileId) => savedFiles[fileId]).find(Boolean);
                  if (firstFile) {
                    await openSavedFile(firstFile);
                  }
                }}
              />
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: palette.ink,
    fontFamily: 'sans-serif',
    fontSize: 15,
  },
  searchShell: {
    minHeight: 50,
    borderRadius: radii.xl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surface,
  },
  filterChipActive: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.accentSoft,
  },
  filterLabel: {
    ...typography.small,
  },
  filterLabelActive: {
    color: palette.accent,
    fontFamily: 'sans-serif-medium',
  },
  listSection: {
    marginTop: spacing.xl,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.separator,
    overflow: 'hidden',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
  },
  emptyBody: {
    ...typography.body,
  },
});
