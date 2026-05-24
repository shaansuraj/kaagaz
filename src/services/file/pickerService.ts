import { kaagazFiles } from '../../types/native-modules';
import { normalizeFilePath } from '../../utils/file';

export type PickedFile = {
  name: string;
  uri: string;
  path: string;
  mimeType: string | null;
  size: number | null;
};

function normalizePickedFile(file: Awaited<ReturnType<typeof kaagazFiles.pickFiles>>[number]): PickedFile {
  return {
    name: file.name ?? `picked-${Date.now()}`,
    uri: file.uri,
    path: normalizeFilePath(file.path),
    mimeType: file.mimeType,
    size: file.size,
  };
}

async function pickFilesByType(mimeTypes: string[], multiple = true) {
  const results = await kaagazFiles.pickFiles({
    mimeTypes,
    allowMultiple: multiple,
  });

  return results.map(normalizePickedFile);
}

export const pickerService = {
  async pickImages() {
    return pickFilesByType(['image/*'], true);
  },
  async pickOcrSources() {
    return pickFilesByType(['image/*', 'application/pdf'], true);
  },
  async pickSinglePdf() {
    const [file] = await pickFilesByType(['application/pdf'], false);
    return file;
  },
  async pickManyPdfs() {
    return pickFilesByType(['application/pdf'], true);
  },
  async pickSingleDocx() {
    const [file] = await pickFilesByType(
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      false,
    );
    return file;
  },
  async pickDirectory() {
    return kaagazFiles.pickDirectory();
  },
  isCancel(error: unknown) {
    return error instanceof Error && /cancel/i.test(error.message);
  },
};
