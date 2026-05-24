import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { InfoPill } from '../../components/InfoPill';
import { Screen, ScreenHeader } from '../../components/Screen';
import { palette, radii, spacing, typography } from '../../constants/theme';
import { scanDocuments, ensureCameraPermission } from '../../services/camera/scannerService';
import { processImage } from '../../services/cv/imageProcessingService';
import { fileService } from '../../services/file/fileService';
import { useAppStore, useSessionPages } from '../../store/useAppStore';
import { RootStackParamList } from '../../types/models';
import { createId } from '../../utils/id';
import { toFileUri } from '../../utils/file';
import { getCameraCancelTarget } from '../../utils/scanExport';

type Props = NativeStackScreenProps<RootStackParamList, 'CameraScan'>;

async function readImageSize(path: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      toFileUri(path),
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

export function CameraScanScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const shouldAutoOpen = route.params.autoOpen ?? true;
  const session = useAppStore((state) => state.sessions[sessionId]);
  const settings = useAppStore((state) => state.settings);
  const addPage = useAppStore((state) => state.addPage);
  const updatePage = useAppStore((state) => state.updatePage);
  const abandonSession = useAppStore((state) => state.abandonSession);
  const [loading, setLoading] = useState(false);
  const autoOpenedRef = useRef(false);
  const pages = useSessionPages(sessionId);

  const processCapturedPage = useCallback(
    async (
      pageId: string,
      originalImagePath: string,
      processedPath: string,
      thumbnailPath: string,
    ) => {
      try {
        const result = await processImage({
          inputPath: originalImagePath,
          outputPath: processedPath,
          thumbnailPath,
          colorMode: session?.colorMode ?? 'color',
          jpegQuality: settings.jpegQuality,
          maxLongEdge: settings.imageMaxLongEdge,
          enhance: true,
        });

        updatePage(pageId, {
          processedImagePath: result.processedImagePath,
          thumbnailPath: result.thumbnailPath,
          width: result.width,
          height: result.height,
          aspectRatio: result.width / Math.max(result.height, 1),
          processingStatus: 'ready',
          processingError: undefined,
        });
      } catch (error) {
        updatePage(pageId, {
          processingStatus: 'failed',
          processingError:
            error instanceof Error ? error.message : 'Unable to finish page processing.',
        });
      }
    },
    [session?.colorMode, settings.imageMaxLongEdge, settings.jpegQuality, updatePage],
  );

  const openScanner = useCallback(async () => {
    try {
      setLoading(true);
      const granted = await ensureCameraPermission();
      if (!granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to scan documents.');
        return;
      }

      const response = await scanDocuments({
        jpegQuality: settings.jpegQuality,
        maxDocuments: 24,
      });
      if (response.cancelled || response.scannedImages.length === 0) {
        const cancelTarget = getCameraCancelTarget(pages.length);
        if (cancelTarget === 'review') {
          navigation.replace('SessionBuilder', { sessionId });
        } else {
          abandonSession(sessionId);
          navigation.replace('MainTabs');
        }
        return;
      }

      for (const scannedPath of response.scannedImages) {
        const importedPath = await fileService.importScannedImage(sessionId, scannedPath);
        const originalSize = await readImageSize(importedPath);
        const pageId = createId('page');
        const { processedPath, thumbnailPath } = await fileService.buildProcessedPaths(
          sessionId,
          pageId,
        );

        addPage({
          id: pageId,
          sessionId,
          originalImagePath: importedPath,
          processedImagePath: importedPath,
          thumbnailPath: importedPath,
          cropPoints: [
            { x: 0, y: 0 },
            { x: originalSize.width, y: 0 },
            { x: originalSize.width, y: originalSize.height },
            { x: 0, y: originalSize.height },
          ],
          width: originalSize.width,
          height: originalSize.height,
          aspectRatio: originalSize.width / Math.max(originalSize.height, 1),
          rotationDeg: 0,
          processingStatus: 'processing',
          processingError: undefined,
          filterMode: session?.colorMode ?? 'color',
          sourceCaptureMode: 'scanner',
        });

        processCapturedPage(pageId, importedPath, processedPath, thumbnailPath);
      }

      navigation.replace('SessionBuilder', { sessionId });
    } catch (error) {
      Alert.alert(
        'Scan failed',
        error instanceof Error ? error.message : 'Unable to open the scanner.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    abandonSession,
    addPage,
    navigation,
    pages.length,
    session?.colorMode,
    sessionId,
    settings.jpegQuality,
    processCapturedPage,
  ]);

  useEffect(() => {
    if (!session) {
      navigation.replace('MainTabs');
      return;
    }

    if (shouldAutoOpen && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openScanner();
    }
  }, [navigation, openScanner, session, shouldAutoOpen]);

  if (!session) {
    return null;
  }

  return (
    <Screen
      scroll={false}
      footer={
        <View style={styles.footerActions}>
          <AppButton
            loading={loading}
            onPress={openScanner}
            size="lg"
            title={pages.length > 0 ? 'Scan More Pages' : 'Open Scanner'}
          />
          <View style={styles.footerRow}>
            <AppButton
              onPress={() => navigation.replace('SessionBuilder', { sessionId })}
              style={styles.footerButton}
              title="Review Session"
              tone="tertiary"
            />
            <AppButton
              onPress={() => {
                abandonSession(sessionId);
                navigation.replace('MainTabs');
              }}
              style={styles.footerButton}
              title="Cancel"
              tone="ghost"
            />
          </View>
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
          eyebrow="Scanner"
          title="Capture multiple pages"
          subtitle="The native scanner handles document edges and multi-page capture while Kaagaz processes each page in the background."
        />
      }>
      <View style={styles.statusRow}>
        <InfoPill label={session.colorMode === 'bw' ? 'Black & White mode' : 'Color mode'} variant="accent" />
        <InfoPill label="Auto crop in scanner" variant="success" />
        <InfoPill label="Background enhancement" variant="default" />
      </View>

      <View style={styles.previewBox}>
        <View style={styles.previewSheet}>
          <View style={styles.previewFrame} />
        </View>
        <Text style={styles.previewText}>Align the paper inside the frame</Text>
        <Text style={styles.previewSubtext}>
          Capture one page after another, then review order and export when you are done.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewBox: {
    marginTop: spacing.xl,
    minHeight: 300,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.separator,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  previewSheet: {
    width: '74%',
    aspectRatio: 0.72,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: spacing.md,
  },
  previewFrame: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: palette.accentSecondary,
    borderStyle: 'dashed',
  },
  previewText: {
    ...typography.subtitle,
    color: palette.ink,
  },
  previewSubtext: {
    ...typography.body,
    color: palette.inkSoft,
    textAlign: 'center',
  },
  footerActions: {
    gap: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
