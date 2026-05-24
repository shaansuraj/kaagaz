export type ColorMode = 'color' | 'bw';
export type ScanSessionStatus = 'active' | 'completed' | 'abandoned';
export type PageSize = 'A4' | 'LETTER';
export type CompressionPreset = 'visually-lossless' | 'balanced' | 'small-size';
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type SourceCaptureMode = 'scanner' | 'imported';
export type StorageLocation = 'app' | 'documents' | 'custom';
export type OcrScript = 'latin' | 'chinese' | 'devanagari' | 'japanese' | 'korean';
export type OcrModelStatus = 'bundled' | 'ready' | 'not-installed' | 'downloading' | 'failed';
export type ToolWorkflowKind =
  | 'image-batch'
  | 'pdf-pages'
  | 'pdf-documents'
  | 'docx-pages'
  | 'scan-pages'
  | 'ocr-sources';
export type ToolPreviewKind = 'grid' | 'compare' | 'filmstrip' | 'document-stack';
export type ToolSelectionMode = 'none' | 'single' | 'multiple';
export type PreviewItemKind = 'image' | 'pdf-page' | 'pdf-document' | 'docx-page' | 'scan-page';
export type SavedFileRole =
  | 'pdf'
  | 'docx'
  | 'image'
  | 'text'
  | 'thumbnail'
  | 'compressed'
  | 'merged'
  | 'converted';
export type LibraryItemKind =
  | 'scan'
  | 'pdf'
  | 'docx'
  | 'image-set'
  | 'compressed'
  | 'merged'
  | 'converted';

export type ToolId =
  | 'compress-images'
  | 'compress-pdf'
  | 'images-to-pdf'
  | 'pdf-to-images'
  | 'pdf-merge'
  | 'pdf-extract'
  | 'pdf-reorder'
  | 'pdf-to-docx'
  | 'docx-to-pdf'
  | 'image-cleanup'
  | 'extract-first-page'
  | 'batch-rotate'
  | 'scan-to-jpg'
  | 'ocr-searchable';

export type CropPoint = {
  x: number;
  y: number;
};

export type ScanSession = {
  id: string;
  createdAt: string;
  colorMode: ColorMode;
  pageIds: string[];
  status: ScanSessionStatus;
};

export type ScannedPage = {
  id: string;
  sessionId: string;
  originalImagePath: string;
  processedImagePath: string;
  thumbnailPath: string;
  pageIndex: number;
  cropPoints: CropPoint[];
  width: number;
  height: number;
  aspectRatio: number;
  rotationDeg: number;
  processingStatus: ProcessingStatus;
  processingError?: string;
  filterMode: ColorMode;
  sourceCaptureMode: SourceCaptureMode;
  createdAt: string;
};

export type SavedFile = {
  id: string;
  role: SavedFileRole;
  mimeType: string;
  path: string | null;
  uri: string | null;
  displayName: string;
  relativePath: string | null;
  sizeBytes: number | null;
  storageLocation: StorageLocation;
  createdAt: string;
  sourceFileId?: string | null;
  previewPath?: string | null;
  pageCount?: number | null;
  ocrEnabled?: boolean;
  ocrScript?: OcrScript | null;
  searchable?: boolean;
};

export type ExportedDocument = {
  id: string;
  sessionId: string;
  name: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  libraryItemId: string | null;
  pdfFileId: string | null;
  docxFileId: string | null;
  imageFileIds: string[];
  textFileId: string | null;
  ocrStatus?: 'idle' | 'running' | 'ready' | 'failed';
  ocrScript?: OcrScript | null;
  ocrCachePath?: string | null;
};

export type LibraryItem = {
  id: string;
  kind: LibraryItemKind;
  sourceTool: 'scanner' | ToolId;
  name: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  thumbnailPath: string | null;
  sessionId: string | null;
  fileIds: string[];
};

export type AppSettings = {
  defaultPageSize: PageSize;
  jpegQuality: number;
  defaultColorMode?: ColorMode;
  defaultSaveRoot: string;
  rememberExportFolder: boolean;
  preferredTreeUri?: string | null;
  autoCompressOnSave: boolean;
  defaultCompressionPreset: CompressionPreset;
  pdfImageQuality: number;
  imageMaxLongEdge: number;
  keepOriginals: boolean;
  preferredOcrScript: OcrScript;
  keepOcrCache: boolean;
  showOcrOnExport: boolean;
};

export type OcrBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OcrLine = {
  text: string;
  confidence?: number | null;
  bounds: OcrBounds;
};

export type OcrBlock = {
  text: string;
  confidence?: number | null;
  bounds: OcrBounds;
  lines: OcrLine[];
};

export type OcrPageResult = {
  pageNumber: number;
  width: number;
  height: number;
  text: string;
  blocks: OcrBlock[];
};

export type PreviewItem = {
  id: string;
  sourcePath: string;
  thumbnailPath: string | null;
  fullPreviewPath: string | null;
  kind: PreviewItemKind;
  pageNumber: number | null;
  width: number;
  height: number;
  rotationDeg: number;
  selected: boolean;
  sourceLabel?: string;
  parentSourceId?: string | null;
  parentSourceName?: string | null;
};

export type ToolDraft = {
  sourceFiles: string[];
  previewItems: PreviewItem[];
  selectedIds: string[];
  orderedIds: string[];
  focusedId: string | null;
  toolOptions: Record<string, string | number | boolean | null | string[]>;
  resultFiles: SavedFile[];
  jobStatus: 'idle' | 'preparing' | 'ready' | 'running' | 'failed' | 'completed';
};

export type RootStackParamList = {
  Splash: undefined;
  MainTabs: undefined;
  NewScanSettings: undefined;
  CameraScan: { sessionId: string; autoOpen?: boolean };
  SessionBuilder: { sessionId: string };
  ExportAction: { sessionId: string };
  PrintPreparation: { documentId: string };
  DocumentDetail: { documentId: string };
  ToolWorkflow: { toolId: ToolId };
  Settings: undefined;
  About: undefined;
  Privacy: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  ToolsHub: undefined;
  Library: undefined;
};
