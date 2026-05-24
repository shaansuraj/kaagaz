import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppButton } from '../../components/AppButton';
import { InfoPill } from '../../components/InfoPill';
import { Screen, ScreenHeader } from '../../components/Screen';
import { palette, radii, spacing, typography } from '../../constants/theme';
import { generateDocx, generatePdf, generateSearchablePdf } from '../../services/export/exportService';
import { fileService, visibleFolders } from '../../services/file/fileService';
import {
  createOrUpdateDocumentRecord,
  saveSandboxFileToVisibleStorage,
} from '../../services/library/libraryService';
import {
  downloadOcrModel,
  exportOcrText,
  getAvailableOcrModels,
  readOcrCache,
  runOcrOnImages,
  saveOcrCache,
} from '../../services/ocr/ocrService';
import { useAppStore, useDocumentBySessionId, useSessionPages } from '../../store/useAppStore';
import { OcrModelStatus, OcrScript, RootStackParamList } from '../../types/models';
import { buildDefaultDocumentName } from '../../utils/date';
import { sanitizeFileName } from '../../utils/file';
import { getOcrScriptLabel } from '../../utils/ocr';
import { resolveExportImagePaths } from '../../utils/scanExport';

type Props = NativeStackScreenProps<RootStackParamList, 'ExportAction'>;

type BusyAction =
  | 'pdf'
  | 'docx'
  | 'images'
  | 'print'
  | 'searchable-pdf'
  | 'text'
  | 'download-ocr'
  | null;

type OcrModelInfo = Awaited<ReturnType<typeof getAvailableOcrModels>>;

const ocrScripts: OcrScript[] = ['latin', 'devanagari', 'chinese', 'japanese', 'korean'];

export function ExportActionScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const settings = useAppStore((state) => state.settings);
  const session = useAppStore((state) => state.sessions[sessionId]);
  const pages = useSessionPages(sessionId);
  const existingDocument = useDocumentBySessionId(sessionId);
  const [name, setName] = useState(
    existingDocument?.name ?? buildDefaultDocumentName(new Date().toISOString()),
  );
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [ocrModels, setOcrModels] = useState<OcrModelInfo | null>(null);
  const [ocrScript, setOcrScript] = useState<OcrScript>(
    existingDocument?.ocrScript ?? settings.preferredOcrScript,
  );
  const [ocrPhase, setOcrPhase] = useState<string | null>(null);

  useEffect(() => {
    if (!session || pages.length === 0) {
      navigation.replace('MainTabs');
    }
  }, [navigation, pages.length, session]);

  useEffect(() => {
    if (!settings.showOcrOnExport) {
      return;
    }

    getAvailableOcrModels()
      .then(setOcrModels)
      .catch(() => {
        setOcrModels(null);
      });
  }, [settings.showOcrOnExport]);

  if (!session || pages.length === 0) {
    return null;
  }

  const baseName = sanitizeFileName(name) || buildDefaultDocumentName(new Date().toISOString());
  const selectedScriptStatus: OcrModelStatus =
    ocrScript === 'latin'
      ? 'bundled'
      : ocrModels?.scripts?.[ocrScript] ?? 'not-installed';
  const showDownloadButton =
    settings.showOcrOnExport && ocrScript !== 'latin' && selectedScriptStatus !== 'ready';
  const ocrStatusCopy = (() => {
    if (ocrPhase) {
      return ocrPhase;
    }

    switch (selectedScriptStatus) {
      case 'bundled':
        return 'Bundled in Kaagaz';
      case 'ready':
        return 'Installed on this device';
      case 'downloading':
        return 'Downloading language pack';
      case 'failed':
        return 'Language pack unavailable';
      case 'not-installed':
      default:
        return ocrScript === 'latin'
          ? 'Bundled in Kaagaz'
          : 'Download needed for this script';
    }
  })();

  const createPdfRecord = async () => {
    const imagePaths = await resolveExportImagePaths(pages, fileService.pathExists);
    const sandboxPdf = await fileService.buildExportPath(
      existingDocument?.id ?? sessionId,
      baseName,
      'pdf',
    );

    await generatePdf({
      imagePaths,
      outputPath: sandboxPdf,
      documentName: baseName,
      pageSize: settings.defaultPageSize,
      createdAt: existingDocument?.createdAt ?? new Date().toISOString(),
      imageQuality: settings.pdfImageQuality,
    });

    const visiblePdf = await saveSandboxFileToVisibleStorage({
      sandboxPath: sandboxPdf,
      displayName: `${baseName}.pdf`,
      role: 'pdf',
      relativePath: visibleFolders.pdfs,
      mimeType: 'application/pdf',
      pageCount: pages.length,
    });

    return createOrUpdateDocumentRecord({
      documentId: existingDocument?.id,
      sessionId,
      name: baseName,
      pageCount: pages.length,
      createdAt: existingDocument?.createdAt,
      pdfFileId: visiblePdf.id,
      docxFileId: existingDocument?.docxFileId ?? null,
      imageFileIds: existingDocument?.imageFileIds ?? [],
      textFileId: existingDocument?.textFileId ?? null,
      libraryItemId: existingDocument?.libraryItemId ?? null,
      ocrStatus: existingDocument?.ocrStatus ?? 'idle',
      ocrScript: existingDocument?.ocrScript ?? null,
      ocrCachePath: existingDocument?.ocrCachePath ?? null,
    });
  };

  const createDocxRecord = async () => {
    const imagePaths = await resolveExportImagePaths(pages, fileService.pathExists);
    const sandboxDocx = await fileService.buildExportPath(
      existingDocument?.id ?? sessionId,
      baseName,
      'docx',
    );

    await generateDocx({
      imagePaths,
      outputPath: sandboxDocx,
      documentName: baseName,
      createdAt: existingDocument?.createdAt ?? new Date().toISOString(),
    });

    const visibleDocx = await saveSandboxFileToVisibleStorage({
      sandboxPath: sandboxDocx,
      displayName: `${baseName}.docx`,
      role: 'docx',
      relativePath: visibleFolders.docx,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pageCount: pages.length,
    });

    return createOrUpdateDocumentRecord({
      documentId: existingDocument?.id,
      sessionId,
      name: baseName,
      pageCount: pages.length,
      createdAt: existingDocument?.createdAt,
      pdfFileId: existingDocument?.pdfFileId ?? null,
      docxFileId: visibleDocx.id,
      imageFileIds: existingDocument?.imageFileIds ?? [],
      textFileId: existingDocument?.textFileId ?? null,
      libraryItemId: existingDocument?.libraryItemId ?? null,
      ocrStatus: existingDocument?.ocrStatus ?? 'idle',
      ocrScript: existingDocument?.ocrScript ?? null,
      ocrCachePath: existingDocument?.ocrCachePath ?? null,
    });
  };

  const createImagesRecord = async () => {
    const imagePaths = await resolveExportImagePaths(pages, fileService.pathExists);

    const visibleImages = await Promise.all(
      imagePaths.map((imagePath, index) => {
        const displayName =
          imagePaths.length === 1 ? `${baseName}.jpg` : `${baseName} - Page ${index + 1}.jpg`;

        return saveSandboxFileToVisibleStorage({
          sandboxPath: imagePath,
          displayName,
          role: 'image',
          relativePath: visibleFolders.scans,
          mimeType: 'image/jpeg',
          previewPath:
            pages[index]?.thumbnailPath ?? pages[index]?.processedImagePath ?? imagePath,
          pageCount: 1,
        });
      }),
    );

    return createOrUpdateDocumentRecord({
      documentId: existingDocument?.id,
      sessionId,
      name: baseName,
      pageCount: pages.length,
      createdAt: existingDocument?.createdAt,
      pdfFileId: existingDocument?.pdfFileId ?? null,
      docxFileId: existingDocument?.docxFileId ?? null,
      imageFileIds: visibleImages.map((file) => file.id),
      textFileId: existingDocument?.textFileId ?? null,
      libraryItemId: existingDocument?.libraryItemId ?? null,
      ocrStatus: existingDocument?.ocrStatus ?? 'idle',
      ocrScript: existingDocument?.ocrScript ?? null,
      ocrCachePath: existingDocument?.ocrCachePath ?? null,
    });
  };

  const ensureOcrModelReady = async () => {
    if (ocrScript === 'latin') {
      return;
    }

    const status = selectedScriptStatus;
    if (status === 'ready') {
      return;
    }

    const fallback =
      !ocrModels?.playServicesAvailable
        ? 'Google Play Services is unavailable on this device.'
        : 'Download the OCR language pack first, then try again.';

    throw new Error(`${getOcrScriptLabel(ocrScript)} OCR is not ready. ${fallback}`);
  };

  const getOcrPagesForSession = async (imagePaths: string[]) => {
    if (
      existingDocument?.ocrCachePath &&
      existingDocument.ocrScript === ocrScript &&
      (await fileService.pathExists(existingDocument.ocrCachePath))
    ) {
      return {
        ocrPages: await readOcrCache(existingDocument.ocrCachePath),
        cachePath: existingDocument.ocrCachePath,
      };
    }

    setOcrPhase('Recognizing text');
    const ocrPages = await runOcrOnImages({
      imagePaths,
      script: ocrScript,
    });

    if (!ocrPages.some((page) => page.text.trim().length > 0)) {
      throw new Error(
        'No readable text was recognized. Save the scan normally or retry OCR with another script.',
      );
    }

    const cachePath = settings.keepOcrCache
      ? await fileService.buildOcrCachePath(`${baseName}-${ocrScript}`)
      : null;

    if (cachePath) {
      await saveOcrCache(cachePath, ocrPages);
    }

    return { ocrPages, cachePath };
  };

  const createSearchablePdfRecord = async () => {
    await ensureOcrModelReady();
    const imagePaths = await resolveExportImagePaths(pages, fileService.pathExists);
    const { ocrPages, cachePath } = await getOcrPagesForSession(imagePaths);
    const sandboxPdf = await fileService.buildExportPath(
      existingDocument?.id ?? sessionId,
      baseName,
      'pdf',
    );

    setOcrPhase('Building searchable PDF');
    await generateSearchablePdf({
      imagePaths,
      ocrPages,
      outputPath: sandboxPdf,
      documentName: baseName,
      pageSize: settings.defaultPageSize,
      createdAt: existingDocument?.createdAt ?? new Date().toISOString(),
      imageQuality: settings.pdfImageQuality,
      script: ocrScript,
    });

    const visiblePdf = await saveSandboxFileToVisibleStorage({
      sandboxPath: sandboxPdf,
      displayName: `${baseName}.pdf`,
      role: 'pdf',
      relativePath: visibleFolders.pdfs,
      mimeType: 'application/pdf',
      pageCount: pages.length,
      ocrEnabled: true,
      searchable: true,
      ocrScript,
    });

    return createOrUpdateDocumentRecord({
      documentId: existingDocument?.id,
      sessionId,
      name: baseName,
      pageCount: pages.length,
      createdAt: existingDocument?.createdAt,
      pdfFileId: visiblePdf.id,
      docxFileId: existingDocument?.docxFileId ?? null,
      imageFileIds: existingDocument?.imageFileIds ?? [],
      textFileId: existingDocument?.textFileId ?? null,
      libraryItemId: existingDocument?.libraryItemId ?? null,
      ocrStatus: 'ready',
      ocrScript,
      ocrCachePath: cachePath,
    });
  };

  const createTextRecord = async () => {
    await ensureOcrModelReady();
    const imagePaths = await resolveExportImagePaths(pages, fileService.pathExists);
    const { ocrPages, cachePath } = await getOcrPagesForSession(imagePaths);
    const sandboxText = await fileService.buildOutputPath(`${baseName}-${ocrScript}`, 'txt');

    setOcrPhase('Saving text');
    await exportOcrText({
      ocrPages,
      outputPath: sandboxText,
    });

    const visibleText = await saveSandboxFileToVisibleStorage({
      sandboxPath: sandboxText,
      displayName: `${baseName}.txt`,
      role: 'text',
      relativePath: visibleFolders.text,
      mimeType: 'text/plain',
      pageCount: pages.length,
      previewPath: pages[0]?.thumbnailPath ?? pages[0]?.processedImagePath ?? null,
      ocrEnabled: true,
      ocrScript,
    });

    return createOrUpdateDocumentRecord({
      documentId: existingDocument?.id,
      sessionId,
      name: baseName,
      pageCount: pages.length,
      createdAt: existingDocument?.createdAt,
      pdfFileId: existingDocument?.pdfFileId ?? null,
      docxFileId: existingDocument?.docxFileId ?? null,
      imageFileIds: existingDocument?.imageFileIds ?? [],
      textFileId: visibleText.id,
      libraryItemId: existingDocument?.libraryItemId ?? null,
      ocrStatus: 'ready',
      ocrScript,
      ocrCachePath: cachePath,
    });
  };

  const runDownload = async () => {
    try {
      setBusyAction('download-ocr');
      setOcrPhase('Checking language pack');
      const result = await downloadOcrModel(ocrScript);
      setOcrModels(result);
      setOcrPhase(null);
    } catch (error) {
      setOcrPhase(null);
      Alert.alert(
        'Language pack download failed',
        error instanceof Error ? error.message : 'Unable to download the OCR language pack.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const runAction = async (action: Exclude<BusyAction, 'download-ocr' | null>) => {
    try {
      setBusyAction(action);
      setOcrPhase(action === 'searchable-pdf' || action === 'text' ? 'Checking language pack' : null);

      if (action === 'pdf') {
        const document = await createPdfRecord();
        navigation.replace('DocumentDetail', { documentId: document.id });
        return;
      }

      if (action === 'docx') {
        const document = await createDocxRecord();
        navigation.replace('DocumentDetail', { documentId: document.id });
        return;
      }

      if (action === 'images') {
        const document = await createImagesRecord();
        navigation.replace('DocumentDetail', { documentId: document.id });
        return;
      }

      if (action === 'searchable-pdf') {
        const document = await createSearchablePdfRecord();
        navigation.replace('DocumentDetail', { documentId: document.id });
        return;
      }

      if (action === 'text') {
        const document = await createTextRecord();
        navigation.replace('DocumentDetail', { documentId: document.id });
        return;
      }

      const document = existingDocument?.pdfFileId ? existingDocument : await createPdfRecord();
      navigation.replace('PrintPreparation', { documentId: document.id });
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error ? error.message : 'Unable to prepare the document.',
      );
    } finally {
      setBusyAction(null);
      setOcrPhase(null);
    }
  };

  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="Finish"
          title="Save, share, or print"
          subtitle="Choose the output format. Kaagaz keeps the final file easy to find in Documents."
        />
      }>
      <View style={styles.topMeta}>
        <InfoPill label={`${pages.length} page${pages.length === 1 ? '' : 's'}`} variant="accent" />
        <InfoPill
          label={
            settings.rememberExportFolder && settings.preferredTreeUri
              ? 'Custom export folder'
              : 'Documents/Kaagaz'
          }
          variant="default"
        />
      </View>

      <View style={styles.namePanel}>
        <Text style={styles.panelLabel}>Document name</Text>
        <Text style={styles.panelCaption}>
          Used for saved files, recent history, and print jobs.
        </Text>
        <TextInput
          accessibilityLabel="Document name"
          onChangeText={setName}
          placeholder="Document name"
          placeholderTextColor={palette.inkMuted}
          style={styles.input}
          value={name}
        />
      </View>

      {settings.showOcrOnExport ? (
        <View style={styles.section}>
          <View style={styles.outputHeader}>
            <Text style={styles.panelTitle}>OCR</Text>
            <Text style={styles.panelCaption}>
              OCR stays on-device. English is bundled, while other scripts can be downloaded once.
            </Text>
          </View>

          <View style={styles.ocrPanel}>
            <View style={styles.segmentRow}>
              {ocrScripts.map((script) => (
                <Pressable
                  key={script}
                  onPress={() => setOcrScript(script)}
                  style={[styles.segment, ocrScript === script && styles.segmentSelected]}>
                  <Text
                    style={[
                      styles.segmentLabel,
                      ocrScript === script && styles.segmentLabelSelected,
                    ]}>
                    {getOcrScriptLabel(script)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.ocrStatusRow}>
              <InfoPill label={ocrStatusCopy} variant={selectedScriptStatus === 'ready' || selectedScriptStatus === 'bundled' ? 'success' : 'default'} />
              {ocrModels && !ocrModels.playServicesAvailable && ocrScript !== 'latin' ? (
                <InfoPill label="Play Services unavailable" variant="default" />
              ) : null}
            </View>

            {showDownloadButton ? (
              <AppButton
                title={
                  busyAction === 'download-ocr'
                    ? 'Downloading language pack...'
                    : `Download ${getOcrScriptLabel(ocrScript)} pack`
                }
                onPress={runDownload}
                tone="tertiary"
                size="sm"
                loading={busyAction === 'download-ocr'}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.outputHeader}>
          <Text style={styles.panelTitle}>Output actions</Text>
          <Text style={styles.panelCaption}>
            Files are saved to{' '}
            {settings.rememberExportFolder && settings.preferredTreeUri
              ? 'your selected export folder.'
              : 'Documents/Kaagaz.'}
          </Text>
        </View>

        <View style={styles.outputList}>
          <OutputChoice
            active={busyAction === 'pdf'}
            description="Create and save a PDF ready for sharing, library storage, and printing."
            icon="file-pdf-box"
            label="Save as PDF"
            onPress={() => runAction('pdf')}
          />
          <OutputChoice
            active={busyAction === 'docx'}
            description="Create and save a DOCX with each processed page inserted as a full-width image."
            icon="file-word-box"
            label="Save as DOCX"
            onPress={() => runAction('docx')}
          />
          <OutputChoice
            active={busyAction === 'images'}
            description="Save every scanned page as a clean JPG image in Documents/Kaagaz/Scans."
            icon="file-image-outline"
            label="Save as Images"
            onPress={() => runAction('images')}
          />
          {settings.showOcrOnExport ? (
            <>
              <OutputChoice
                active={busyAction === 'searchable-pdf'}
                description="Recognize text on-device, then save a searchable PDF without changing how the scan looks."
                icon="text-recognition"
                label="Save as Searchable PDF"
                onPress={() => runAction('searchable-pdf')}
              />
              <OutputChoice
                active={busyAction === 'text'}
                description="Extract recognized text into a local .txt file for copy, share, and reuse."
                icon="file-document-outline"
                label="Extract Text"
                onPress={() => runAction('text')}
              />
            </>
          ) : null}
          <OutputChoice
            active={busyAction === 'print'}
            description="Generate or reuse the PDF, then open Android's system print sheet."
            icon="printer-outline"
            label="Print"
            onPress={() => runAction('print')}
          />
        </View>
      </View>
    </Screen>
  );
}

function OutputChoice({
  icon,
  label,
  description,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.outputCard, active && styles.outputCardActive]}>
      <View style={[styles.outputIconWrap, active && styles.outputIconWrapActive]}>
        <MaterialCommunityIcons
          color={active ? palette.white : palette.accent}
          name={icon}
          size={20}
        />
      </View>

      <View style={styles.outputCopy}>
        <Text style={styles.outputLabel}>{label}</Text>
        <Text style={styles.outputDescription}>{description}</Text>
      </View>

      <View style={[styles.outputActionWrap, active && styles.outputActionWrapActive]}>
        <Text style={[styles.outputAction, active && styles.outputActionActive]}>
          {active ? 'Working...' : 'Select'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  namePanel: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
  },
  panelLabel: {
    ...typography.label,
    color: palette.accent,
  },
  panelTitle: {
    ...typography.subtitle,
  },
  panelCaption: {
    ...typography.small,
    color: palette.inkSoft,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    color: palette.ink,
    fontFamily: 'sans-serif',
    fontSize: 15,
  },
  outputHeader: {
    gap: spacing.xs,
  },
  ocrPanel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: radii.xl,
    backgroundColor: palette.surface,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surface,
  },
  segmentSelected: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.accentSoft,
  },
  segmentLabel: {
    ...typography.small,
    color: palette.ink,
  },
  segmentLabelSelected: {
    color: palette.accent,
    fontFamily: 'sans-serif-medium',
  },
  ocrStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  outputList: {
    gap: spacing.sm,
  },
  outputCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  outputCardActive: {
    borderColor: palette.accent,
    backgroundColor: palette.surface,
  },
  outputIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.accentStrong,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outputIconWrapActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  outputCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  outputLabel: {
    ...typography.bodyStrong,
  },
  outputDescription: {
    ...typography.small,
    color: palette.inkSoft,
  },
  outputActionWrap: {
    minWidth: 78,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
  },
  outputActionWrapActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  outputAction: {
    ...typography.label,
    color: palette.inkSoft,
  },
  outputActionActive: {
    color: palette.accent,
  },
});
