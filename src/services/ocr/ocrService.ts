import { kaagazOcr } from '../../types/native-modules';
import { OcrPageResult, OcrScript } from '../../types/models';
import { fileService } from '../file/fileService';
import { normalizeFilePath } from '../../utils/file';

export async function getAvailableOcrModels() {
  return kaagazOcr.getAvailableOcrModels();
}

export async function downloadOcrModel(script: OcrScript) {
  return kaagazOcr.downloadOcrModel(script);
}

export async function runOcrOnImages(options: {
  imagePaths: string[];
  script: OcrScript;
}) {
  return kaagazOcr.runOcrOnImages({
    ...options,
    imagePaths: options.imagePaths.map(normalizeFilePath),
  });
}

export async function exportOcrText(options: {
  ocrPages: OcrPageResult[];
  outputPath: string;
}) {
  return kaagazOcr.exportOcrText({
    ...options,
    outputPath: normalizeFilePath(options.outputPath),
  });
}

export async function saveOcrCache(cachePath: string, pages: OcrPageResult[]) {
  await fileService.writeText(cachePath, JSON.stringify(pages));
  return cachePath;
}

export async function readOcrCache(cachePath: string) {
  const raw = await fileService.readText(cachePath);
  return JSON.parse(raw) as OcrPageResult[];
}
