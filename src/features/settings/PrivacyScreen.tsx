import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { palette, spacing, typography } from '../../constants/theme';
import { RootStackParamList } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

const points = [
  'Kaagaz does not require login, account creation, ads, analytics, or cloud sync.',
  'Scans, exports, converted files, tool outputs, and OCR results are created locally on the device.',
  'Files are shared only when you explicitly use Share, Open, Print, or another export action.',
  'If you choose a non-English OCR script, Kaagaz may request a one-time language pack download through Google Play Services. OCR still runs locally on the device after installation.',
  'Camera permission is used only for scanning. Document or folder access is used only when you choose files or save to a selected folder.',
  'Release builds do not depend on internet access for the app to work. Debug builds may use a development server during testing.',
  'If you delete a document or tool result from Kaagaz, the related app-managed working files are removed from local storage.',
];

export function PrivacyScreen(_: Props) {
  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="Privacy"
          title="Local-first by design"
          subtitle="No remote upload, no tracking, and no hidden data collection."
        />
      }>
      <SectionCard title="Privacy policy" caption="Kaagaz is designed to keep document processing on-device.">
        <View style={styles.points}>
          {points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.body}>{point}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  points: {
    gap: spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bullet: {
    ...typography.bodyStrong,
    color: palette.accent,
    marginTop: 1,
  },
  body: {
    ...typography.body,
    flex: 1,
  },
});
