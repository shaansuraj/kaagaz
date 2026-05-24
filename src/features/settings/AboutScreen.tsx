import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { palette, spacing, typography } from '../../constants/theme';
import { RootStackParamList } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const paragraphs = [
  'Kaagaz is being built as a practical offline document workbench for everyday official work. Many people still need to scan forms, combine PDFs, compress files, convert pages, and print clean copies quickly, but too many tools depend on accounts, ads, subscriptions, or cloud uploads.',
  'This application exists to keep that work simple and trustworthy. The goal is to make document handling feel like using a dependable machine: open it, do the job, save the result, and move on without unnecessary friction.',
  'Kaagaz focuses on local-first workflows so day-to-day paperwork can still move even when the network is slow, unavailable, or inappropriate for sensitive files. The long-term aim is a complete free toolbox that remains useful in offices, field work, schools, service counters, and home study setups.',
];

export function AboutScreen(_: Props) {
  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="About"
          title="Why Kaagaz exists"
          subtitle="A free offline utility for practical document work."
        />
      }>
      <SectionCard title="Mission" caption="Built to keep routine document work local, simple, and dependable.">
        <View style={styles.paragraphs}>
          {paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.body}>
              {paragraph}
            </Text>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paragraphs: {
    gap: spacing.md,
  },
  body: {
    ...typography.body,
    color: palette.inkSoft,
  },
});
