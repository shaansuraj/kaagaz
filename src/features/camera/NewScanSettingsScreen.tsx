import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { Screen, ScreenHeader } from '../../components/Screen';
import { palette, radii, spacing, typography } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { ColorMode, RootStackParamList } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'NewScanSettings'>;

export function NewScanSettingsScreen({ navigation }: Props) {
  const settings = useAppStore((state) => state.settings);
  const startSession = useAppStore((state) => state.startSession);
  const [colorMode, setColorMode] = useState<ColorMode>(settings.defaultColorMode ?? 'color');

  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="New Scan"
          title="Choose the scan finish"
          subtitle="Set the output mode once, then scan several pages in one continuous flow."
        />
      }
      footer={
        <AppButton
          title="Start Scanning"
          size="lg"
          onPress={() => {
            const sessionId = startSession(colorMode);
            navigation.replace('CameraScan', { sessionId, autoOpen: true });
          }}
        />
      }>
      <View style={styles.selectorShell}>
        <View style={styles.segmentedControl}>
          <Pressable
            onPress={() => setColorMode('color')}
            style={[styles.segment, colorMode === 'color' && styles.segmentActive]}>
            <Text style={[styles.segmentTitle, colorMode === 'color' && styles.segmentTitleActive]}>
              Color
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setColorMode('bw')}
            style={[styles.segment, colorMode === 'bw' && styles.segmentActive]}>
            <Text style={[styles.segmentTitle, colorMode === 'bw' && styles.segmentTitleActive]}>
              Black & White
            </Text>
          </Pressable>
        </View>
        <Text style={styles.selectorBody}>
          {colorMode === 'bw'
            ? 'Use strong contrast for forms, text-heavy pages, and print-first copies.'
            : 'Preserve highlights, signatures, stamps, and colored notes.'}
        </Text>
      </View>

      <View style={styles.sampleSection}>
        <Text style={styles.sampleLabel}>Live sample</Text>
        <View style={styles.sampleCard}>
          <SampleDocumentPreview colorMode={colorMode} />
          <View style={styles.sampleCopy}>
            <Text style={styles.sampleTitle}>
              {colorMode === 'bw' ? 'Crisp text-first finish' : 'Readable color-preserving finish'}
            </Text>
            <Text style={styles.sampleBody}>
              {colorMode === 'bw'
                ? 'Good for forms, letters, and pages that will be printed or compressed heavily.'
                : 'Good for receipts, certificates, and documents where original markings matter.'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.flowSection}>
        <Text style={styles.flowLabel}>Session flow</Text>
        <Text style={styles.flowStep}>1. Scan one or more pages</Text>
        <Text style={styles.flowStep}>2. Review order and previews</Text>
        <Text style={styles.flowStep}>3. Save, share, or print locally</Text>
      </View>
    </Screen>
  );
}

function SampleDocumentPreview({ colorMode }: { colorMode: ColorMode }) {
  const isBw = colorMode === 'bw';

  return (
    <View style={styles.samplePreviewFrame}>
      <View style={styles.samplePreviewPaper}>
        <View style={styles.sampleHeaderRow}>
          <View
            style={[
              styles.sampleStamp,
              isBw ? styles.sampleStampBw : styles.sampleStampColor,
            ]}
          />
          <View style={styles.sampleHeaderCopy}>
            <View style={[styles.sampleLineLong, isBw ? styles.sampleLineBw : styles.sampleLineColor]} />
            <View style={[styles.sampleLineShort, isBw ? styles.sampleLineBw : styles.sampleLineSoft]} />
          </View>
        </View>

        <View style={styles.sampleBodyGroup}>
          <View style={[styles.sampleLineLong, isBw ? styles.sampleLineBw : styles.sampleLineColor]} />
          <View style={[styles.sampleLineLong, isBw ? styles.sampleLineBw : styles.sampleLineNeutral]} />
          <View style={[styles.sampleLineMedium, isBw ? styles.sampleLineBw : styles.sampleLineNeutral]} />
          <View style={[styles.sampleLineShort, isBw ? styles.sampleLineBw : styles.sampleLineSoft]} />
        </View>

        <View style={styles.sampleFooterRow}>
          <View
            style={[
              styles.sampleTag,
              isBw ? styles.sampleTagBw : styles.sampleTagColor,
            ]}
          />
          <View
            style={[
              styles.sampleSignature,
              isBw ? styles.sampleSignatureBw : styles.sampleSignatureColor,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorShell: {
    gap: spacing.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.separator,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
  },
  segmentTitle: {
    ...typography.bodyStrong,
    color: palette.inkMuted,
  },
  segmentTitleActive: {
    color: palette.accent,
  },
  selectorBody: {
    ...typography.body,
    color: palette.inkSoft,
  },
  sampleSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sampleLabel: {
    ...typography.label,
    color: palette.accent,
  },
  sampleCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
    alignItems: 'center',
  },
  samplePreviewFrame: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  samplePreviewPaper: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  sampleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sampleStamp: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  sampleStampColor: {
    backgroundColor: '#BEE2DE',
    borderWidth: 1,
    borderColor: palette.accentStrong,
  },
  sampleStampBw: {
    backgroundColor: '#D3D6D7',
    borderWidth: 1,
    borderColor: '#8A9598',
  },
  sampleHeaderCopy: {
    flex: 1,
    gap: 5,
  },
  sampleBodyGroup: {
    gap: 6,
  },
  sampleFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sampleLineLong: {
    height: 6,
    width: '100%',
    borderRadius: radii.pill,
  },
  sampleLineMedium: {
    height: 6,
    width: '78%',
    borderRadius: radii.pill,
  },
  sampleLineShort: {
    height: 6,
    width: '58%',
    borderRadius: radii.pill,
  },
  sampleLineColor: {
    backgroundColor: '#8EB8B4',
  },
  sampleLineSoft: {
    backgroundColor: '#CFE3E0',
  },
  sampleLineNeutral: {
    backgroundColor: '#DCE5E3',
  },
  sampleLineBw: {
    backgroundColor: '#909A9E',
  },
  sampleTag: {
    width: 26,
    height: 10,
    borderRadius: radii.pill,
  },
  sampleTagColor: {
    backgroundColor: '#E0EFEA',
    borderWidth: 1,
    borderColor: '#A8CCC0',
  },
  sampleTagBw: {
    backgroundColor: '#D9DDDE',
    borderWidth: 1,
    borderColor: '#9EA7AA',
  },
  sampleSignature: {
    width: 34,
    height: 8,
    borderRadius: radii.pill,
  },
  sampleSignatureColor: {
    backgroundColor: '#5C8F96',
  },
  sampleSignatureBw: {
    backgroundColor: '#667175',
  },
  sampleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  sampleTitle: {
    ...typography.bodyStrong,
  },
  sampleBody: {
    ...typography.body,
  },
  flowSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.separator,
    gap: spacing.sm,
  },
  flowLabel: {
    ...typography.label,
    color: palette.accent,
  },
  flowStep: {
    ...typography.body,
  },
});
