import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { InfoPill } from '../../components/InfoPill';
import { PageThumbnailCard } from '../../components/PageThumbnailCard';
import { Screen, ScreenHeader } from '../../components/Screen';
import { palette, spacing, typography } from '../../constants/theme';
import { fileService } from '../../services/file/fileService';
import { useAppStore, useSessionPages } from '../../store/useAppStore';
import { RootStackParamList } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionBuilder'>;

export function SessionBuilderScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const session = useAppStore((state) => state.sessions[sessionId]);
  const pages = useSessionPages(sessionId);
  const removePage = useAppStore((state) => state.removePage);
  const reorderSessionPages = useAppStore((state) => state.reorderSessionPages);
  const completeSession = useAppStore((state) => state.completeSession);
  const hasProcessing = pages.some(
    (page) => page.processingStatus === 'processing' || page.processingStatus === 'pending',
  );
  const hasFailure = pages.some((page) => page.processingStatus === 'failed');
  const canFinish =
    pages.length > 0 && !hasFailure && pages.every((page) => page.processingStatus === 'ready');

  useEffect(() => {
    if (!session) {
      navigation.replace('MainTabs');
    }
  }, [navigation, session]);

  if (!session) {
    return null;
  }

  const renderItem = ({
    item,
    getIndex,
    drag,
    isActive,
  }: RenderItemParams<(typeof pages)[number]>) => (
    <View style={[styles.pageRow, isActive ? styles.dragging : undefined]}>
      <PageThumbnailCard
        index={getIndex() ?? 0}
        onDelete={() =>
          Alert.alert('Delete page', 'Remove this page from the current session?', [
            { style: 'cancel', text: 'Keep' },
            {
              style: 'destructive',
              text: 'Delete',
              onPress: async () => {
                await fileService.deleteIfExists(item.originalImagePath);
                await fileService.deleteIfExists(item.processedImagePath);
                await fileService.deleteIfExists(item.thumbnailPath);
                removePage(item.id);
              },
            },
          ])
        }
        page={item}
      />
      <Text onLongPress={drag} style={styles.dragHint}>
        Hold to reorder
      </Text>
    </View>
  );

  return (
    <Screen
      scroll={false}
      footer={
        <View style={styles.footer}>
          <AppButton
            title="Add Another Page"
            tone="tertiary"
            onPress={() => navigation.replace('CameraScan', { sessionId, autoOpen: true })}
          />
          <AppButton
            key={canFinish ? 'finish-ready' : 'finish-blocked'}
            title={hasFailure ? 'Fix failed pages' : hasProcessing ? 'Processing pages...' : 'Finish'}
            disabled={!canFinish}
            onPress={() => {
              completeSession(sessionId);
              navigation.replace('ExportAction', { sessionId });
            }}
          />
        </View>
      }
      header={
        <ScreenHeader
          accessory={
            <InfoPill
              label={`${pages.length} page${pages.length === 1 ? '' : 's'}`}
              variant="accent"
            />
          }
          eyebrow="Review"
          title="Arrange the scan"
          subtitle="Check order, remove mistakes, and wait for background processing to finish before export."
        />
      }>
      <View style={styles.statusRow}>
        <InfoPill
          label={hasFailure ? 'Some pages failed' : hasProcessing ? 'Processing pages' : 'Ready to finish'}
          variant={hasFailure || hasProcessing ? 'default' : 'success'}
        />
        <InfoPill
          label={session.colorMode === 'bw' ? 'Black & White mode' : 'Color mode'}
          variant="accent"
        />
      </View>

      {pages.length === 0 ? (
        <Text style={styles.emptyCopy}>No pages yet. Open the scanner to start this document.</Text>
      ) : (
        <View style={styles.listWrap}>
          <DraggableFlatList
            data={pages}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data }) => {
              reorderSessionPages(
                sessionId,
                data.map((page) => page.id),
              );
            }}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  listWrap: {
    minHeight: 220,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.separator,
  },
  emptyCopy: {
    ...typography.body,
    marginTop: spacing.xl,
  },
  pageRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  footer: {
    gap: spacing.sm,
  },
  dragHint: {
    ...typography.label,
    color: palette.inkMuted,
    marginBottom: spacing.sm,
    marginLeft: 98,
  },
  dragging: {
    opacity: 0.86,
  },
});
