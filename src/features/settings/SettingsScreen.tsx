import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppButton } from '../../components/AppButton';
import { Screen, ScreenHeader } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { palette, radii, spacing, typography } from '../../constants/theme';
import { fileService } from '../../services/file/fileService';
import { pickerService } from '../../services/file/pickerService';
import { downloadOcrModel, getAvailableOcrModels } from '../../services/ocr/ocrService';
import { useAppStore } from '../../store/useAppStore';
import { OcrScript, RootStackParamList } from '../../types/models';
import { humanFileSize } from '../../utils/file';
import { getOcrScriptLabel } from '../../utils/ocr';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const ocrScripts: OcrScript[] = ['latin', 'devanagari', 'chinese', 'japanese', 'korean'];

type OcrModelInfo = Awaited<ReturnType<typeof getAvailableOcrModels>>;

export function SettingsScreen({ navigation }: Props) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [storageUsage, setStorageUsage] = useState('0 B');
  const [ocrModels, setOcrModels] = useState<OcrModelInfo | null>(null);
  const [downloadingScript, setDownloadingScript] = useState<OcrScript | null>(null);

  useEffect(() => {
    fileService.getStorageUsage().then((value) => setStorageUsage(humanFileSize(value)));
    getAvailableOcrModels()
      .then(setOcrModels)
      .catch(() => {
        setOcrModels(null);
      });
  }, []);

  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="Settings"
          title="Document defaults"
          subtitle="Choose where Kaagaz saves files and how it handles quality, OCR, compression, and offline behavior."
        />
      }>
      <SectionCard
        title="Storage"
        caption="Working files stay inside the app, while saved results go to visible local folders.">
        <View style={styles.infoRow}>
          <Text style={styles.label}>Visible save root</Text>
          <Text style={styles.value}>{fileService.getVisibleRootLabel()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>App workspace</Text>
          <Text style={styles.mono}>{fileService.getRootPath()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Current usage</Text>
          <Text style={styles.value}>{storageUsage}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Custom export folder</Text>
          <Text style={styles.value}>
            {settings.preferredTreeUri && settings.rememberExportFolder
              ? 'Enabled'
              : 'Documents/Kaagaz'}
          </Text>
        </View>
        <View style={styles.inlineButtons}>
          <AppButton
            title="Choose Folder"
            tone="tertiary"
            size="sm"
            fullWidth={false}
            onPress={async () => {
              const result = await pickerService.pickDirectory();
              if (result?.uri) {
                updateSettings({
                  preferredTreeUri: result.uri,
                  rememberExportFolder: true,
                });
              }
            }}
          />
          <AppButton
            title={settings.rememberExportFolder ? 'Use Documents Root' : 'Use Selected Folder'}
            tone="ghost"
            size="sm"
            fullWidth={false}
            onPress={() =>
              updateSettings({
                rememberExportFolder: !settings.rememberExportFolder,
              })
            }
          />
        </View>
      </SectionCard>

      <SectionCard
        title="OCR"
        caption="English is bundled. Additional scripts can be downloaded once on supported devices and used offline afterward."
        style={styles.section}>
        <View style={styles.optionGroup}>
          <Text style={styles.label}>Preferred OCR script</Text>
          <View style={styles.segmentRow}>
            {ocrScripts.map((script) => (
              <SegmentButton
                key={script}
                label={getOcrScriptLabel(script)}
                selected={settings.preferredOcrScript === script}
                onPress={() => updateSettings({ preferredOcrScript: script })}
              />
            ))}
          </View>
        </View>

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Show OCR in export flow</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="On"
              selected={settings.showOcrOnExport}
              onPress={() => updateSettings({ showOcrOnExport: true })}
            />
            <SegmentButton
              label="Off"
              selected={!settings.showOcrOnExport}
              onPress={() => updateSettings({ showOcrOnExport: false })}
            />
          </View>
        </View>

        <View style={styles.optionGroup}>
          <Text style={styles.label}>Keep OCR cache</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="On"
              selected={settings.keepOcrCache}
              onPress={() => updateSettings({ keepOcrCache: true })}
            />
            <SegmentButton
              label="Off"
              selected={!settings.keepOcrCache}
              onPress={() => updateSettings({ keepOcrCache: false })}
            />
          </View>
        </View>

        <View style={styles.modelList}>
          {ocrScripts.map((script) => {
            const status =
              script === 'latin'
                ? 'bundled'
                : ocrModels?.scripts?.[script] ?? 'not-installed';

            return (
              <View key={script} style={styles.modelRow}>
                <View style={styles.modelCopy}>
                  <Text style={styles.modelName}>{getOcrScriptLabel(script)}</Text>
                  <Text style={styles.modelStatus}>{getStatusLabel(status)}</Text>
                </View>

                {script !== 'latin' ? (
                  <AppButton
                    title={
                      downloadingScript === script
                        ? 'Downloading...'
                        : status === 'ready'
                          ? 'Installed'
                          : 'Download'
                    }
                    onPress={async () => {
                      try {
                        setDownloadingScript(script);
                        const result = await downloadOcrModel(script);
                        setOcrModels(result);
                      } finally {
                        setDownloadingScript(null);
                      }
                    }}
                    tone={status === 'ready' ? 'ghost' : 'tertiary'}
                    size="sm"
                    fullWidth={false}
                    disabled={
                      downloadingScript === script ||
                      !ocrModels?.playServicesAvailable ||
                      status === 'ready'
                    }
                  />
                ) : (
                  <Text style={styles.bundledTag}>Built in</Text>
                )}
              </View>
            );
          })}
        </View>

        {ocrModels && !ocrModels.playServicesAvailable ? (
          <Text style={styles.hint}>
            Google Play Services is unavailable, so extra OCR script downloads cannot run on this device.
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard
        title="PDF defaults"
        caption="These settings apply when Kaagaz creates new PDFs."
        style={styles.section}>
        <View style={styles.optionGroup}>
          <Text style={styles.label}>Default page size</Text>
          <View style={styles.segmentRow}>
            {(['A4', 'LETTER'] as const).map((pageSize) => (
              <SegmentButton
                key={pageSize}
                label={pageSize}
                selected={settings.defaultPageSize === pageSize}
                onPress={() => updateSettings({ defaultPageSize: pageSize })}
              />
            ))}
          </View>
        </View>
        <View style={styles.optionGroup}>
          <Text style={styles.label}>PDF image quality: {settings.pdfImageQuality}</Text>
          <Slider
            maximumTrackTintColor={palette.border}
            maximumValue={95}
            minimumTrackTintColor={palette.accent}
            minimumValue={60}
            onSlidingComplete={(value) => updateSettings({ pdfImageQuality: Math.round(value) })}
            step={1}
            thumbTintColor={palette.accent}
            value={settings.pdfImageQuality}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Image defaults"
        caption="Used for scanned pages, cleanup, and compression workflows."
        style={styles.section}>
        <View style={styles.optionGroup}>
          <Text style={styles.label}>JPEG quality: {settings.jpegQuality}</Text>
          <Slider
            maximumTrackTintColor={palette.border}
            maximumValue={95}
            minimumTrackTintColor={palette.accent}
            minimumValue={60}
            onSlidingComplete={(value) => updateSettings({ jpegQuality: Math.round(value) })}
            step={1}
            thumbTintColor={palette.accent}
            value={settings.jpegQuality}
          />
        </View>
        <View style={styles.optionGroup}>
          <Text style={styles.label}>Max image long edge: {settings.imageMaxLongEdge}px</Text>
          <Slider
            maximumTrackTintColor={palette.border}
            maximumValue={3200}
            minimumTrackTintColor={palette.accent}
            minimumValue={1600}
            onSlidingComplete={(value) => updateSettings({ imageMaxLongEdge: Math.round(value) })}
            step={100}
            thumbTintColor={palette.accent}
            value={settings.imageMaxLongEdge}
          />
        </View>
        <View style={styles.optionGroup}>
          <Text style={styles.label}>Auto-compress on save</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="On"
              selected={settings.autoCompressOnSave}
              onPress={() => updateSettings({ autoCompressOnSave: true })}
            />
            <SegmentButton
              label="Off"
              selected={!settings.autoCompressOnSave}
              onPress={() => updateSettings({ autoCompressOnSave: false })}
            />
          </View>
        </View>
        <View style={styles.optionGroup}>
          <Text style={styles.label}>Keep originals</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="On"
              selected={settings.keepOriginals}
              onPress={() => updateSettings({ keepOriginals: true })}
            />
            <SegmentButton
              label="Off"
              selected={!settings.keepOriginals}
              onPress={() => updateSettings({ keepOriginals: false })}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="About and privacy"
        caption="Mission and privacy details for the offline-first product."
        style={styles.section}>
        <View style={styles.links}>
          <Pressable onPress={() => navigation.navigate('About')} style={styles.linkRow}>
            <Text style={styles.linkTitle}>About Kaagaz</Text>
            <MaterialCommunityIcons color={palette.accent} name="chevron-right" size={20} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Privacy')} style={styles.linkRow}>
            <Text style={styles.linkTitle}>Privacy policy</Text>
            <MaterialCommunityIcons color={palette.accent} name="chevron-right" size={20} />
          </Pressable>
        </View>
      </SectionCard>
    </Screen>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, selected && styles.segmentActive]}>
      <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'bundled':
      return 'Bundled in app';
    case 'ready':
      return 'Installed';
    case 'downloading':
      return 'Downloading';
    case 'failed':
      return 'Unavailable';
    case 'not-installed':
    default:
      return 'Not installed';
  }
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  infoRow: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyStrong,
  },
  value: {
    ...typography.body,
  },
  mono: {
    ...typography.small,
  },
  inlineButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  segmentActive: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.accentSoft,
  },
  segmentLabel: {
    ...typography.small,
  },
  segmentLabelActive: {
    color: palette.accent,
    fontFamily: 'sans-serif-medium',
  },
  modelList: {
    gap: spacing.md,
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modelCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  modelName: {
    ...typography.bodyStrong,
  },
  modelStatus: {
    ...typography.small,
    color: palette.inkSoft,
  },
  bundledTag: {
    ...typography.label,
    color: palette.accent,
  },
  hint: {
    ...typography.small,
    color: palette.inkSoft,
  },
  links: {
    gap: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  linkTitle: {
    ...typography.bodyStrong,
  },
});
