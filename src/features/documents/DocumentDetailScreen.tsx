import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { DocumentRow } from '../../components/DocumentRow';
import { PaperPreview } from '../../components/PaperPreview';
import { Screen, ScreenHeader } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { palette, spacing, typography } from '../../constants/theme';
import {
  copyTextToClipboard,
  openSavedFile,
  shareSavedFile,
} from '../../services/file/documentActions';
import { fileService } from '../../services/file/fileService';
import {
  useAppStore,
  useDocumentSavedFiles,
  useSessionPages,
} from '../../store/useAppStore';
import { RootStackParamList } from '../../types/models';
import { formatDateTime } from '../../utils/date';
import { getOcrScriptLabel } from '../../utils/ocr';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentDetail'>;

export function DocumentDetailScreen({ navigation, route }: Props) {
  const document = useAppStore((state) => state.documents[route.params.documentId]);
  const deleteDocumentRecord = useAppStore((state) => state.deleteDocumentRecord);
  const pages = useSessionPages(document?.sessionId ?? '');
  const files = useDocumentSavedFiles(route.params.documentId);
  const [textPreview, setTextPreview] = useState('');
  const [textExpanded, setTextExpanded] = useState(false);

  const textFile = useMemo(
    () => files.find((file) => file.role === 'text') ?? null,
    [files],
  );

  useEffect(() => {
    if (!document) {
      navigation.replace('MainTabs');
    }
  }, [document, navigation]);

  useEffect(() => {
    if (!textFile?.path) {
      setTextPreview('');
      return;
    }

    fileService
      .readText(textFile.path)
      .then((content) => {
        setTextPreview(content.trim());
      })
      .catch(() => {
        setTextPreview('');
      });
  }, [textFile?.path]);

  if (!document) {
    return null;
  }

  const visibleText =
    textExpanded || textPreview.length <= 800
      ? textPreview
      : `${textPreview.slice(0, 800).trimEnd()}...`;

  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="Document"
          title={document.name}
          subtitle={formatDateTime(document.updatedAt)}
        />
      }>
      <SectionCard
        title="Saved files"
        caption="These files are already saved locally and ready for open, share, save, or print.">
        {files.length === 0 ? (
          <Text style={styles.emptyBody}>No saved files yet. Export PDF, DOCX, images, or text first.</Text>
        ) : (
          files.map((file) => (
            <View key={file.id} style={styles.fileRow}>
              <DocumentRow
                title={file.displayName}
                meta={file.relativePath ?? 'Saved locally'}
                badges={[
                  file.searchable ? 'SEARCHABLE PDF' : file.role.toUpperCase(),
                  ...(file.ocrScript ? [getOcrScriptLabel(file.ocrScript)] : []),
                ]}
                onPress={() => openSavedFile(file)}
              />
              <View style={styles.inlineActions}>
                <AppButton
                  title="Open"
                  onPress={() => openSavedFile(file)}
                  tone="tertiary"
                  size="sm"
                  fullWidth={false}
                />
                <AppButton
                  title="Share"
                  onPress={() => shareSavedFile(file, file.displayName)}
                  tone="ghost"
                  size="sm"
                  fullWidth={false}
                />
              </View>
            </View>
          ))
        )}
      </SectionCard>

      {textFile ? (
        <SectionCard
          title="Recognized text"
          caption="Preview, copy, or share the OCR result without leaving the app."
          style={styles.section}>
          {textPreview ? (
            <>
              <Text style={styles.textPreview}>{visibleText}</Text>
              <View style={styles.inlineActions}>
                {textPreview.length > 800 ? (
                  <AppButton
                    title={textExpanded ? 'Show Less' : 'View Text'}
                    onPress={() => setTextExpanded((current) => !current)}
                    tone="tertiary"
                    size="sm"
                    fullWidth={false}
                  />
                ) : null}
                <AppButton
                  title="Copy Text"
                  onPress={async () => {
                    try {
                      await copyTextToClipboard(textPreview);
                    } catch (error) {
                      Alert.alert(
                        'Copy failed',
                        error instanceof Error ? error.message : 'Unable to copy the recognized text.',
                      );
                    }
                  }}
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                />
                <AppButton
                  title="Share Text"
                  onPress={() => shareSavedFile(textFile, textFile.displayName)}
                  tone="ghost"
                  size="sm"
                  fullWidth={false}
                />
              </View>
            </>
          ) : (
            <Text style={styles.emptyBody}>No OCR text preview is available yet.</Text>
          )}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Page preview"
        caption="The entire page is fitted inside each preview frame so the saved output matches what you scanned."
        style={styles.section}>
        <View style={styles.previewStack}>
          {pages.map((page, index) => (
            <View key={page.id} style={styles.previewCard}>
              <Text style={styles.previewLabel}>Page {index + 1}</Text>
              <PaperPreview imagePath={page.processedImagePath} aspectRatio={page.aspectRatio} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Actions"
        caption="Continue working with this document or remove it from the device."
        style={styles.section}>
        <View style={styles.actions}>
          <AppButton
            onPress={() => navigation.navigate('ExportAction', { sessionId: document.sessionId })}
            title="Export Another Format"
            tone="tertiary"
          />
          {textFile ? (
            <AppButton
              onPress={() => navigation.navigate('ExportAction', { sessionId: document.sessionId })}
              title="Regenerate OCR"
              tone="secondary"
            />
          ) : null}
          {document.pdfFileId ? (
            <AppButton
              onPress={() => navigation.navigate('PrintPreparation', { documentId: document.id })}
              title="Print"
              tone="secondary"
            />
          ) : null}
          <AppButton
            onPress={() =>
              Alert.alert(
                'Delete document',
                'Delete this document and its saved files from the device?',
                [
                  { style: 'cancel', text: 'Keep' },
                  {
                    style: 'destructive',
                    text: 'Delete',
                    onPress: async () => {
                      await fileService.deleteDocumentFiles(document, files);
                      deleteDocumentRecord(document.id);
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'MainTabs' }],
                      });
                    },
                  },
                ],
              )
            }
            title="Delete Document"
            tone="danger"
          />
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  emptyBody: {
    ...typography.body,
  },
  fileRow: {
    gap: spacing.sm,
  },
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textPreview: {
    ...typography.body,
    color: palette.inkSoft,
    lineHeight: 22,
  },
  previewStack: {
    gap: spacing.lg,
  },
  previewCard: {
    gap: spacing.sm,
  },
  previewLabel: {
    ...typography.label,
    color: palette.inkMuted,
  },
  actions: {
    gap: spacing.sm,
  },
});
