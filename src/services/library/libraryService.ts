import { fileService, visibleFolders } from '../file/fileService';
import {
  ExportedDocument,
  LibraryItem,
  LibraryItemKind,
  OcrScript,
  SavedFile,
  SavedFileRole,
  StorageLocation,
  ToolId,
} from '../../types/models';
import { createId } from '../../utils/id';
import { sanitizeFileName } from '../../utils/file';
import { useAppStore } from '../../store/useAppStore';

function buildSavedFile(options: {
  role: SavedFileRole;
  displayName: string;
  mimeType: string;
  path: string | null;
  uri: string | null;
  relativePath: string | null;
  sizeBytes: number | null;
  storageLocation: StorageLocation;
  sourceFileId?: string | null;
  previewPath?: string | null;
  pageCount?: number | null;
  ocrEnabled?: boolean;
  ocrScript?: OcrScript | null;
  searchable?: boolean;
}) {
  const file: SavedFile = {
    id: createId('file'),
    role: options.role,
    displayName: options.displayName,
    mimeType: options.mimeType,
    path: options.path,
    uri: options.uri,
    relativePath: options.relativePath,
    sizeBytes: options.sizeBytes,
    storageLocation: options.storageLocation,
    createdAt: new Date().toISOString(),
    sourceFileId: options.sourceFileId ?? null,
    previewPath: options.previewPath ?? null,
    pageCount: options.pageCount ?? null,
    ocrEnabled: options.ocrEnabled ?? false,
    ocrScript: options.ocrScript ?? null,
    searchable: options.searchable ?? false,
  };

  useAppStore.getState().upsertSavedFile(file);
  return file;
}

export async function saveSandboxFileToVisibleStorage(options: {
  sandboxPath: string;
  displayName: string;
  role: SavedFileRole;
  relativePath: string;
  mimeType: string;
  previewPath?: string | null;
  pageCount?: number | null;
  ocrEnabled?: boolean;
  ocrScript?: OcrScript | null;
  searchable?: boolean;
}) {
  const settings = useAppStore.getState().settings;
  const targetName = sanitizeFileName(options.displayName) || options.displayName;
  const preferredTreeUri = settings.rememberExportFolder ? settings.preferredTreeUri : null;

  const result = preferredTreeUri
    ? await fileService.saveFileToTreeUri({
        sourcePath: options.sandboxPath,
        treeUri: preferredTreeUri,
        displayName: targetName,
        mimeType: options.mimeType,
      })
    : await fileService.saveFileToDocuments({
        sourcePath: options.sandboxPath,
        relativePath: options.relativePath,
        displayName: targetName,
        mimeType: options.mimeType,
      });

  return buildSavedFile({
    role: options.role,
    displayName: targetName,
    mimeType: options.mimeType,
    path: options.sandboxPath,
    uri: result.uri,
    relativePath: result.relativePath,
    sizeBytes: result.sizeBytes,
    storageLocation: preferredTreeUri ? 'custom' : 'documents',
    previewPath: options.previewPath ?? null,
    pageCount: options.pageCount ?? null,
    ocrEnabled: options.ocrEnabled ?? false,
    ocrScript: options.ocrScript ?? null,
    searchable: options.searchable ?? false,
  });
}

export function createLibraryItem(options: {
  kind: LibraryItemKind;
  name: string;
  sourceTool: 'scanner' | ToolId;
  pageCount: number;
  thumbnailPath: string | null;
  sessionId?: string | null;
  fileIds: string[];
}) {
  const item: LibraryItem = {
    id: createId('library'),
    kind: options.kind,
    sourceTool: options.sourceTool,
    name: options.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pageCount: options.pageCount,
    thumbnailPath: options.thumbnailPath,
    sessionId: options.sessionId ?? null,
    fileIds: options.fileIds,
  };

  useAppStore.getState().upsertLibraryItem(item);
  return item;
}

export function createOrUpdateDocumentRecord(options: {
  documentId?: string;
  sessionId: string;
  name: string;
  pageCount: number;
  pdfFileId?: string | null;
  docxFileId?: string | null;
  imageFileIds?: string[];
  textFileId?: string | null;
  libraryItemId?: string | null;
  createdAt?: string;
  ocrStatus?: ExportedDocument['ocrStatus'];
  ocrScript?: OcrScript | null;
  ocrCachePath?: string | null;
}) {
  const document: ExportedDocument = {
    id: options.documentId ?? createId('document'),
    sessionId: options.sessionId,
    name: options.name,
    pageCount: options.pageCount,
    createdAt: options.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    libraryItemId: options.libraryItemId ?? null,
    pdfFileId: options.pdfFileId ?? null,
    docxFileId: options.docxFileId ?? null,
    imageFileIds: options.imageFileIds ?? [],
    textFileId: options.textFileId ?? null,
    ocrStatus: options.ocrStatus ?? 'idle',
    ocrScript: options.ocrScript ?? null,
    ocrCachePath: options.ocrCachePath ?? null,
  };

  useAppStore.getState().upsertDocument(document);
  return document;
}

export const libraryFolderMap = {
  pdf: visibleFolders.pdfs,
  docx: visibleFolders.docx,
  text: visibleFolders.text,
  image: visibleFolders.images,
  compressed: visibleFolders.compressed,
  merged: visibleFolders.merged,
  converted: visibleFolders.converted,
} as const;
