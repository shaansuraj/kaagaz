import { kaagazPrint } from '../../types/native-modules';
import { normalizeFilePath } from '../../utils/file';

export async function openSystemPrintDialog(pdfPath: string, jobName: string) {
  return kaagazPrint.openSystemPrintDialog(normalizeFilePath(pdfPath), jobName);
}
