import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { palette, radii, shadows, spacing, typography } from '../constants/theme';
import { toFileUri } from '../utils/file';

type Props = {
  imagePath?: string | null;
  aspectRatio?: number;
  style?: ViewStyle;
  compact?: boolean;
  label?: string;
  rotationDeg?: number;
};

export function PaperPreview({
  imagePath,
  aspectRatio = 0.72,
  style,
  compact = false,
  label,
  rotationDeg = 0,
}: Props) {
  const resolvedAspectRatio = aspectRatio > 0 ? aspectRatio : 0.72;
  const imageStyle = [
    styles.image,
    resolvedAspectRatioStyle(resolvedAspectRatio),
    rotationDeg ? rotatedStyle(rotationDeg) : null,
  ];
  const placeholderStyle = [
    styles.image,
    styles.placeholder,
    resolvedAspectRatioStyle(resolvedAspectRatio),
  ];

  return (
    <View style={[styles.frame, compact ? styles.compactFrame : styles.fullFrame, style]}>
      <View style={styles.paper}>
        {imagePath ? (
          <Image source={{ uri: toFileUri(imagePath) }} style={imageStyle} />
        ) : (
          <View style={placeholderStyle}>
            <Text style={styles.placeholderLabel}>{label ?? 'Preview unavailable'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
  },
  fullFrame: {
    minHeight: 280,
  },
  compactFrame: {
    minHeight: 116,
    paddingVertical: spacing.xs,
  },
  paper: {
    width: '100%',
    borderRadius: radii.lg,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: '100%',
    maxHeight: '100%',
    resizeMode: 'contain',
    borderRadius: 4,
    backgroundColor: palette.white,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1,
    borderColor: palette.separator,
    borderStyle: 'dashed',
  },
  placeholderLabel: {
    ...typography.small,
    color: palette.inkMuted,
  },
});

function resolvedAspectRatioStyle(aspectRatio: number) {
  return {
    aspectRatio,
  } as const;
}

function rotatedStyle(rotationDeg: number) {
  return {
    transform: [{ rotate: `${rotationDeg}deg` }],
  } as const;
}
