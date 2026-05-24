import { NativeModules } from 'react-native';

import { ColorMode, CropPoint, OcrModelStatus, OcrPageResult, OcrScript, PageSize } from './models';

export type ProcessedImageResult = {
  processedImagePath: string;
  thumbnailPath: string;
  width: number;
  height: number;
};

export type SavedPublicFileResult = {
  uri: string;
  relativePath: string;
  sizeBytes: number;
};

export type PickedNativeFile = {
  uri: string;
  name: string;
  path: string;
  mimeType: string | null;
  size: number;
};

export type RenderedPdfImage = {
  path: string;
  width: number;
  height: number;
};

export type PdfPageInfo = {
  pageNumber: number;
  width: number;
  height: number;
};

type KaagazImageProcessorModule = {
  applyCropAndProcess(options: {
    inputPath: string;
    outputPath: string;
    thumbnailPath: string;
    cropPoints: CropPoint[];
    colorMode: ColorMode;
    jpegQuality: number;
  }): Promise<ProcessedImageResult>;
  processImage(options: {
    inputPath: string;
    outputPath: string;
    thumbnailPath?: string;
    colorMode: ColorMode;
    jpegQuality: number;
    rotateDegrees: number;
    maxLongEdge: number;
    enhance: boolean;
  }): Promise<ProcessedImageResult>;
};

type KaagazExportModule = {
  generatePdf(options: {
    imagePaths: string[];
    outputPath: string;
    documentName: string;
    pageSize: PageSize;
    appName: string;
    createdAt: string;
    imageQuality: number;
  }): Promise<string>;
  generateDocx(options: {
    imagePaths: string[];
    outputPath: string;
    documentName: string;
    appName: string;
    createdAt: string;
  }): Promise<string>;
  generateSearchablePdf(options: {
    imagePaths: string[];
    ocrPages: OcrPageResult[];
    outputPath: string;
    documentName: string;
    appName: string;
    createdAt: string;
    pageSize: PageSize;
    imageQuality: number;
    script: OcrScript;
  }): Promise<string>;
  inspectPdf(options: {
    inputPath: string;
  }): Promise<{ pageCount: number; pages: PdfPageInfo[] }>;
  renderPdfToImages(options: {
    inputPath: string;
    outputDir: string;
    format: 'jpg' | 'png';
    quality: number;
    maxLongEdge: number;
    pageIndices?: number[];
  }): Promise<RenderedPdfImage[]>;
  mergePdf(options: {
    inputPaths: string[];
    outputPath: string;
  }): Promise<string>;
  extractPdfPages(options: {
    inputPath: string;
    outputPath: string;
    pageIndices: number[];
  }): Promise<string>;
  reorderPdf(options: {
    inputPath: string;
    outputPath: string;
    pageOrder: number[];
    rotationDeltas?: number[];
  }): Promise<string>;
  compressPdf(options: {
    inputPath: string;
    outputPath: string;
    workingDir?: string;
    pageSize: PageSize;
    quality: number;
    maxLongEdge: number;
  }): Promise<string>;
  docxToPdf(options: {
    inputPath: string;
    outputPath: string;
    documentName: string;
    appName: string;
    createdAt: string;
    pageSize: PageSize;
    imageQuality: number;
  }): Promise<string>;
  extractDocxImages(options: {
    inputPath: string;
    outputDir: string;
  }): Promise<RenderedPdfImage[]>;
};

type KaagazOcrModule = {
  getAvailableOcrModels(): Promise<{
    playServicesAvailable: boolean;
    supportsDynamicDownload: boolean;
    scripts: Record<OcrScript, OcrModelStatus>;
  }>;
  downloadOcrModel(script: OcrScript): Promise<{
    playServicesAvailable: boolean;
    supportsDynamicDownload: boolean;
    scripts: Record<OcrScript, OcrModelStatus>;
  }>;
  runOcrOnImages(options: {
    imagePaths: string[];
    script: OcrScript;
  }): Promise<OcrPageResult[]>;
  exportOcrText(options: {
    ocrPages: OcrPageResult[];
    outputPath: string;
  }): Promise<string>;
};

type KaagazPrintModule = {
  openSystemPrintDialog(pdfPath: string, jobName: string): Promise<boolean>;
};

type KaagazFilesModule = {
  pickFiles(options: {
    mimeTypes: string[];
    allowMultiple: boolean;
  }): Promise<PickedNativeFile[]>;
  pickDirectory(): Promise<{ uri: string }>;
  saveFileToDocuments(options: {
    sourcePath: string;
    relativePath: string;
    displayName: string;
    mimeType: string;
  }): Promise<SavedPublicFileResult>;
  saveFileToTreeUri(options: {
    sourcePath: string;
    treeUri: string;
    displayName: string;
    mimeType: string;
  }): Promise<SavedPublicFileResult>;
  openFile(target: string, mimeType?: string): Promise<boolean>;
  shareFile(
    target: string,
    mimeType?: string,
    title?: string | null,
    message?: string | null,
  ): Promise<boolean>;
  copyText(text: string): Promise<boolean>;
};

type NativeRegistry = {
  KaagazImageProcessor: KaagazImageProcessorModule;
  KaagazExport: KaagazExportModule;
  KaagazOcr: KaagazOcrModule;
  KaagazFiles: KaagazFilesModule;
  KaagazPrint: KaagazPrintModule;
};

const registry = NativeModules as NativeRegistry;

export const kaagazImageProcessor = registry.KaagazImageProcessor;
export const kaagazExport = registry.KaagazExport;
export const kaagazOcr = registry.KaagazOcr;
export const kaagazFiles = registry.KaagazFiles;
export const kaagazPrint = registry.KaagazPrint;
