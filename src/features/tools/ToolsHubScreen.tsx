import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { Screen, ScreenHeader } from '../../components/Screen';
import { ToolDefinition, ToolCategory, toolDefinitions } from '../../constants/tools';
import { palette, radii, spacing, typography } from '../../constants/theme';
import { MainTabParamList } from '../../types/models';

type Props = BottomTabScreenProps<MainTabParamList, 'ToolsHub'>;

const categories: ToolCategory[] = ['Optimize', 'Convert', 'Assemble', 'Extract'];

const categoryMeta: Record<ToolCategory, string> = {
  Optimize: 'Cleanup, compression, and scan enhancement.',
  Convert: 'Image, PDF, and DOCX conversions stored locally.',
  Assemble: 'Merge, reorder, rotate, and prepare final files.',
  Extract: 'Pull pages and images out without internet access.',
};

const categoryAccents: Record<ToolCategory, { tone: string; soft: string; border: string }> = {
  Optimize: { tone: palette.accent, soft: '#ECF5F4', border: '#C9DEDB' },
  Convert: { tone: palette.accentSecondary, soft: '#EDF5F7', border: '#C7DDE1' },
  Assemble: { tone: palette.warning, soft: '#FBF4E9', border: '#E6D2AE' },
  Extract: { tone: palette.success, soft: '#EEF7F2', border: '#C8DFD1' },
};

function getToolHighlights(tool: ToolDefinition) {
  const highlights = [tool.previewKind.replace('-', ' ')];

  if (tool.supportsReorder) {
    highlights.push('reorder');
  }

  if (tool.selectionMode === 'multiple') {
    highlights.push('multi-select');
  }

  if (tool.supportsCompare) {
    highlights.push('compare');
  }

  return highlights.slice(0, 2);
}

export function ToolsHubScreen(_: Props) {
  const navigation = useNavigation<any>();

  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow="Tools"
          title="Offline utilities"
          subtitle="Focused local tools for cleanup, conversion, merge, extraction, and practical daily document work."
        />
      }>
      {categories.map((category) => {
        const tools = toolDefinitions.filter((tool) => tool.category === category);
        const accent = categoryAccents[category];

        return (
          <View key={category} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: accent.tone }]} />
                <Text style={styles.sectionTitle}>{category}</Text>
                <Text style={styles.sectionCount}>{tools.length}</Text>
              </View>
              <Text style={styles.sectionBody}>{categoryMeta[category]}</Text>
            </View>

            <View style={styles.toolPanel}>
              {tools.map((tool) => (
                <Pressable
                  key={tool.id}
                  onPress={() => navigation.navigate('ToolWorkflow', { toolId: tool.id })}
                  style={styles.toolRow}>
                  <View
                    style={[
                      styles.toolIconWrap,
                      {
                        backgroundColor: accent.soft,
                        borderColor: accent.border,
                      },
                    ]}>
                    <MaterialCommunityIcons color={accent.tone} name={tool.icon} size={20} />
                  </View>

                  <View style={styles.toolCopy}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    <Text numberOfLines={2} style={styles.toolBody}>
                      {tool.description}
                    </Text>
                    <View style={styles.chipRow}>
                      {getToolHighlights(tool).map((highlight) => (
                        <View
                          key={`${tool.id}-${highlight}`}
                          style={[
                            styles.toolMetaChip,
                            {
                              backgroundColor: accent.soft,
                              borderColor: accent.border,
                            },
                          ]}>
                          <Text style={[styles.toolMeta, { color: accent.tone }]}>{highlight}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.chevronWrap}>
                    <MaterialCommunityIcons color={accent.tone} name="chevron-right" size={18} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionAccent: {
    width: 9,
    height: 9,
    borderRadius: radii.pill,
  },
  sectionTitle: {
    ...typography.subtitle,
    flex: 1,
  },
  sectionCount: {
    ...typography.small,
    color: palette.inkMuted,
  },
  sectionBody: {
    ...typography.small,
    color: palette.inkSoft,
  },
  toolPanel: {
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.separator,
    overflow: 'hidden',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  toolIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  toolTitle: {
    ...typography.bodyStrong,
  },
  toolBody: {
    ...typography.small,
    color: palette.inkSoft,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  toolMetaChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  toolMeta: {
    ...typography.small,
    fontFamily: 'sans-serif-medium',
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
