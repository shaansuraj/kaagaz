import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { InfoPill } from '../../components/InfoPill';
import { Screen, ScreenHeader } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { spacing, typography } from '../../constants/theme';
import { openSystemPrintDialog } from '../../services/print/printService';
import { useAppStore } from '../../store/useAppStore';
import { RootStackParamList } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'PrintPreparation'>;

export function PrintPreparationScreen({ navigation, route }: Props) {
  const document = useAppStore((state) => state.documents[route.params.documentId]);
  const pdfFile = useAppStore((state) =>
    document?.pdfFileId ? state.savedFiles[document.pdfFileId] : null,
  );
  const [busy, setBusy] = useState(false);

  const startPrint = useCallback(async () => {
    if (!document || !pdfFile?.path) {
      return;
    }

    try {
      setBusy(true);
      await openSystemPrintDialog(pdfFile.path, document.name);
      navigation.replace('DocumentDetail', { documentId: document.id });
    } catch (error) {
      Alert.alert(
        'Print unavailable',
        error instanceof Error
          ? error.message
          : 'Android system print could not be opened.',
      );
    } finally {
      setBusy(false);
    }
  }, [document, navigation, pdfFile?.path]);

  useEffect(() => {
    if (!document || !pdfFile?.path) {
      navigation.replace('MainTabs');
      return;
    }

    startPrint();
  }, [document, navigation, pdfFile?.path, startPrint]);

  if (!document || !pdfFile) {
    return null;
  }

  return (
    <Screen
      footer={
        <AppButton
          loading={busy}
          onPress={startPrint}
          size="lg"
          title="Open Print Dialog Again"
        />
      }
      header={
        <ScreenHeader
          accessory={<InfoPill label="Android system print" variant="accent" />}
          eyebrow="Print"
          title="Prepare the print job"
          subtitle="Final printer options such as copies, paper size, orientation, and duplex appear in Android's print sheet."
        />
      }>
      <SectionCard
        title="System print flow"
        caption="Kaagaz prints the saved PDF, then lets Android handle printer discovery and final print settings.">
        <View style={styles.copyBlock}>
          <Text style={styles.copy}>1. Use the stored PDF for reliable printer output</Text>
          <Text style={styles.copy}>2. Select a printer from Android's system sheet</Text>
          <Text style={styles.copy}>3. Choose copies, orientation, paper size, and duplex if supported</Text>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copyBlock: {
    gap: spacing.sm,
  },
  copy: {
    ...typography.body,
  },
});
