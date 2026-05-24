import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppButton } from '../../components/AppButton';
import { DocumentRow } from '../../components/DocumentRow';
import { Screen } from '../../components/Screen';
import { ToolCategory, toolDefinitions } from '../../constants/tools';
import { isDarkTheme, palette, radii, spacing, typography } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { MainTabParamList } from '../../types/models';
import { formatDateTime } from '../../utils/date';

type Props = BottomTabScreenProps<MainTabParamList, 'HomeTab'>;

const mark = require('../../assets/branding/kaagaz-mark.png');

export function HomeScreen(_: Props) {
  const rootNavigation = useNavigation<any>();
  const documentOrder = useAppStore((state) => state.documentOrder);
  const documentsById = useAppStore((state) => state.documents);
  const savedFiles = useAppStore((state) => state.savedFiles);
  const libraryItems = useAppStore((state) => state.libraryItems);

  const recentDocuments = documentOrder
    .map((id) => documentsById[id])
    .filter(Boolean)
    .slice(0, 8);

  const quickTools = toolDefinitions.slice(0, 4);

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.brandLockup}>
          <View style={styles.brandRow}>
            <View style={styles.brandMarkWrap}>
              <Image accessible accessibilityLabel="Kaagaz mark" source={mark} style={styles.brandMark} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>Kaagaz</Text>
              <Text style={styles.brandCaption}>Free offline document utility</Text>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => rootNavigation.navigate('Settings')}
          style={styles.settingsButton}>
          <MaterialCommunityIcons color={palette.ink} name="cog-outline" size={20} />
        </Pressable>
      </View>

      <View style={styles.heroPanel}>
        <Text style={styles.heroEyebrow}>SCANNER AND TOOLS</Text>
        <Text style={styles.heroTitle}>Ready for official work</Text>
        <Text style={styles.heroBody}>
          Scan papers, convert files, keep outputs visible in Documents, and print everything locally.
        </Text>

        <View style={styles.metaRow}>
          <MetaChip icon="wifi-off" label="Offline" />
          <MetaChip icon="shield-lock-outline" label="Private" />
          <MetaChip icon="folder-outline" label="Documents/Kaagaz" />
        </View>

        <AppButton
          title="New Scan"
          size="lg"
          onPress={() => rootNavigation.navigate('NewScanSettings')}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick tools</Text>
          <Pressable onPress={() => rootNavigation.navigate('ToolsHub')}>
            <Text style={styles.linkLabel}>Open all</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          {quickTools.map((tool) => {
            const tone = getQuickToolTone(tool.category);

            return (
              <Pressable
                key={tool.id}
                onPress={() => rootNavigation.navigate('ToolWorkflow', { toolId: tool.id })}
                style={styles.quickToolRow}>
                <View style={[styles.quickToolIconWrap, tone.iconWrap]}>
                  <MaterialCommunityIcons color={tone.icon} name={tool.icon} size={18} />
                </View>

                <View style={styles.quickToolCopy}>
                  <Text style={styles.quickToolTitle}>{tool.shortLabel}</Text>
                  <Text numberOfLines={2} style={styles.quickToolBody}>
                    {tool.description}
                  </Text>
                </View>

                <View style={styles.quickToolTrailing}>
                  <View style={[styles.quickToolTag, tone.tagWrap]}>
                    <Text numberOfLines={1} style={[styles.quickToolTagLabel, tone.tagText]}>
                      {tool.previewKind.replace('-', ' ')}
                    </Text>
                  </View>
                  <View style={styles.chevronWrap}>
                    <MaterialCommunityIcons color={palette.accent} name="chevron-right" size={18} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent documents</Text>
          <Pressable onPress={() => rootNavigation.navigate('Library')}>
            <Text style={styles.linkLabel}>Open library</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          {recentDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No saved documents yet</Text>
              <Text style={styles.emptyBody}>
                Start with a scan or use a tool to create the first local document.
              </Text>
            </View>
          ) : (
            recentDocuments.map((document) => {
              const files = [document.pdfFileId, document.docxFileId, document.textFileId, ...document.imageFileIds]
                .map((fileId) => (fileId ? savedFiles[fileId] : null))
                .filter(Boolean) as NonNullable<(typeof savedFiles)[string]>[];
              const badges = [
                `${document.pageCount} page${document.pageCount === 1 ? '' : 's'}`,
                ...files.map((file) =>
                  file.searchable ? 'SEARCHABLE PDF' : file.role.toUpperCase(),
                ),
              ];
              const libraryItem = document.libraryItemId
                ? libraryItems[document.libraryItemId]
                : null;

              return (
                <DocumentRow
                  key={document.id}
                  title={document.name}
                  meta={formatDateTime(document.updatedAt)}
                  badges={badges}
                  thumbnailPath={libraryItem?.thumbnailPath ?? null}
                  onPress={() =>
                    rootNavigation.navigate('DocumentDetail', { documentId: document.id })
                  }
                />
              );
            })
          )}
        </View>
      </View>
    </Screen>
  );
}

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metaChip}>
      <MaterialCommunityIcons color={palette.accent} name={icon} size={15} />
      <Text style={styles.metaChipLabel}>{label}</Text>
    </View>
  );
}

function getQuickToolTone(category: ToolCategory) {
  switch (category) {
    case 'Optimize':
      return {
        iconWrap: {
          backgroundColor: isDarkTheme ? '#0F3F3C' : '#E5F1F0',
          borderColor: isDarkTheme ? '#1C6A64' : '#84B2AF',
        },
        icon: isDarkTheme ? palette.white : palette.accent,
        tagWrap: {
          backgroundColor: isDarkTheme ? 'rgba(17, 162, 154, 0.14)' : '#EDF6F5',
          borderColor: isDarkTheme ? '#245F5F' : '#C2DCDA',
        },
        tagText: {
          color: isDarkTheme ? '#98E3DE' : palette.accent,
        },
      };
    case 'Convert':
      return {
        iconWrap: {
          backgroundColor: isDarkTheme ? '#153A55' : '#EAF4F6',
          borderColor: isDarkTheme ? '#285D86' : '#BFD7DB',
        },
        icon: isDarkTheme ? palette.white : palette.accentSecondary,
        tagWrap: {
          backgroundColor: isDarkTheme ? 'rgba(42, 145, 160, 0.15)' : '#F0F7F8',
          borderColor: isDarkTheme ? '#285D86' : '#C9DEE1',
        },
        tagText: {
          color: isDarkTheme ? '#92D4DE' : palette.accentSecondary,
        },
      };
    case 'Assemble':
      return {
        iconWrap: {
          backgroundColor: isDarkTheme ? '#473113' : '#F7EFE1',
          borderColor: isDarkTheme ? '#7A5523' : '#E1CDA9',
        },
        icon: isDarkTheme ? '#F1C77F' : palette.warning,
        tagWrap: {
          backgroundColor: isDarkTheme ? 'rgba(194, 138, 53, 0.15)' : '#FBF5EA',
          borderColor: isDarkTheme ? '#7A5523' : '#E6D3B0',
        },
        tagText: {
          color: isDarkTheme ? '#E8C07B' : '#8C611F',
        },
      };
    case 'Extract':
    default:
      return {
        iconWrap: {
          backgroundColor: isDarkTheme ? '#15372A' : '#EAF4EF',
          borderColor: isDarkTheme ? '#215E46' : '#C3DDCF',
        },
        icon: isDarkTheme ? '#9DE0BC' : palette.success,
        tagWrap: {
          backgroundColor: isDarkTheme ? 'rgba(74, 178, 135, 0.14)' : '#F0F8F4',
          borderColor: isDarkTheme ? '#215E46' : '#C7E0D2',
        },
        tagText: {
          color: isDarkTheme ? '#9ADCB9' : palette.success,
        },
      };
  }
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  brandLockup: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMarkWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#11262A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  brandMark: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  brandCopy: {
    gap: 2,
  },
  brandName: {
    fontFamily: 'sans-serif-medium',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.brandTeal,
    letterSpacing: -0.4,
  },
  brandCaption: {
    ...typography.small,
    color: palette.inkMuted,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPanel: {
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: 26,
    padding: spacing.xl,
  },
  heroEyebrow: {
    ...typography.label,
    color: palette.accent,
  },
  heroTitle: {
    ...typography.title,
  },
  heroBody: {
    ...typography.body,
    color: palette.inkSoft,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceSoft,
  },
  metaChipLabel: {
    ...typography.small,
    color: palette.ink,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
  },
  linkLabel: {
    ...typography.small,
    color: palette.accent,
  },
  panel: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.separator,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  quickToolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  quickToolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToolCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  quickToolTitle: {
    ...typography.bodyStrong,
  },
  quickToolBody: {
    ...typography.small,
    color: palette.inkSoft,
  },
  quickToolTrailing: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  quickToolTag: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: 112,
  },
  quickToolTagLabel: {
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
  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
  },
  emptyBody: {
    ...typography.body,
    color: palette.inkSoft,
  },
});
