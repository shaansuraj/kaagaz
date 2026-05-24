import { ScrollView, StyleSheet, View } from 'react-native';

import { palette, spacing } from '../constants/theme';
import { AppButton } from './AppButton';

export type SelectionToolbarAction = {
  key: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  actions: SelectionToolbarAction[];
};

export function SelectionToolbar({ actions }: Props) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {actions.map((action) => (
          <AppButton
            key={action.key}
            title={action.label}
            onPress={action.onPress}
            size="sm"
            tone="tertiary"
            fullWidth={false}
            disabled={action.disabled}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
    paddingVertical: spacing.sm,
  },
  content: {
    gap: spacing.sm,
  },
});
