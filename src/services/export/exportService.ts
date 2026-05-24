import { kaagazExport } from '../../types/native-modules';
import { OcrPageResult, OcrScript, PageSize } from '../../types/models';
import { normalizeFilePath } from '../../utils/file';

export async function generatePdf(options: {
  imagePaths: string[];
  outputPath: string;
  documentName: string;
  pageSize: PageSize;
  createdAt: string;
  imageQuality: number;
}) {
  return kaagazExport.generatePdf({
    ...options,
    appName: 'Kaagaz',
    imagePaths: options.imagePaths.map(normalizeFilePath),
    outputPath: normalizeFilePath(options.outputPath),
  });
}

export async function generateDocx(options: {
  imagePaths: string[];
  outputPath: string;
  documentName: string;
  createdAt: string;
}) {
  return kaagazExport.generateDocx({
    ...options,
    appName: 'Kaagaz',
    imagePaths: options.imagePaths.map(normalizeFilePath),
    outputPath: normalizeFilePath(options.outputPath),
  });
}

export async function generateSearchablePdf(options: {
  imagePaths: string[];
  ocrPages: OcrPageResult[];
  outputPath: string;
  documentName: string;
  pageSize: PageSize;
  createdAt: string;
  imageQuality: number;
  script: OcrScript;
}) {
  return kaagazExport.generateSearchablePdf({
    ...options,
    appName: 'Kaagaz',
    imagePaths: options.imagePaths.map(normalizeFilePath),
    outputPath: normalizeFilePath(options.outputPath),
  });
}

export async function inspectPdf(inputPath: string) {
  return kaagazExport.inspectPdf({
    inputPath: normalizeFilePath(inputPath),
  });
}

export async function renderPdfToImages(options: {
  inputPath: string;
  outputDir: string;
  format: 'jpg' | 'png';
  quality: number;
  maxLongEdge: number;
  pageIndices?: number[];
}) {
  return kaagazExport.renderPdfToImages({
    ...options,
    inputPath: normalizeFilePath(options.inputPath),
    outputDir: normalizeFilePath(options.outputDir),
  });
}

export async function mergePdf(inputPaths: string[], outputPath: string) {
  return kaagazExport.mergePdf({
    inputPaths: inputPaths.map(normalizeFilePath),
    outputPath: normalizeFilePath(outputPath),
  });
}

export async function extractPdfPages(options: {
  inputPath: string;
  outputPath: string;
  pageIndices: number[];
}) {
  return kaagazExport.extractPdfPages({
    ...options,
    inputPath: normalizeFilePath(options.inputPath),
    outputPath: normalizeFilePath(options.outputPath),
  });
}

export async function reorderPdf(options: {
  inputPath: string;
  outputPath: string;
  pageOrder: number[];
  rotationDeltas?: number[];
}) {
  return kaagazExport.reorderPdf({
    ...options,
    inputPath: normalizeFilePath(options.inputPath),
    outputPath: normalizeFilePath(options.outputPath),
  });
}

export async function compressPdf(options: {
  inputPath: string;
  outputPath: string;
  workingDir?: string;
  pageSize: PageSize;
  quality: number;
  maxLongEdge: number;
}) {
  return kaagazExport.compressPdf({
    ...options,
    inputPath: normalizeFilePath(options.inputPath),
    outputPath: normalizeFilePath(options.outputPath),
    workingDir: options.workingDir ? normalizeFilePath(options.workingDir) : undefined,
  });
}

export async function docxToPdf(options: {
  inputPath: string;
  outputPath: string;
  documentName: string;
  createdAt: string;
  pageSize: PageSize;
  imageQuality: number;
}) {
  return kaagazExport.docxToPdf({
    ...options,
    appName: 'Kaagaz',
    inputPath: normalizeFilePath(options.inputPath),
    outputPath: normalizeFilePath(options.outputPath),
  });
}

export async function extractDocxImages(options: {
  inputPath: string;
  outputDir: string;
}) {
  return kaagazExport.extractDocxImages({
    inputPath: normalizeFilePath(options.inputPath),
    outputDir: normalizeFilePath(options.outputDir),
  });
}
