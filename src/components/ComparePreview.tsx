import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typography } from '../constants/theme';
import { PaperPreview } from './PaperPreview';

type Props = {
  leftLabel: string;
  rightLabel: string;
  leftImagePath?: string | null;
  rightImagePath?: string | null;
  aspectRatio?: number;
  rotationDeg?: number;
};

export function ComparePreview({
  leftLabel,
  rightLabel,
  leftImagePath,
  rightImagePath,
  aspectRatio,
  rotationDeg = 0,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.column}>
        <Text style={styles.label}>{leftLabel}</Text>
        <PaperPreview
          imagePath={leftImagePath}
          aspectRatio={aspectRatio}
          rotationDeg={rotationDeg}
          label="Original preview"
          compact
        />
      </View>
      <View style={styles.column}>
        <Text style={styles.label}>{rightLabel}</Text>
        <PaperPreview
          imagePath={rightImagePath}
          aspectRatio={aspectRatio}
          rotationDeg={rotationDeg}
          label="Processed preview"
          compact
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  column: {
    flex: 1,
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: palette.inkSoft,
  },
});
