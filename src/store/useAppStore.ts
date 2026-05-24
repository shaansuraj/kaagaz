import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import {
  AppSettings,
  ColorMode,
  ExportedDocument,
  LibraryItem,
  LibraryItemKind,
  SavedFile,
  SavedFileRole,
  ScanSession,
  ScannedPage,
} from '../types/models';
import { createId } from '../utils/id';
import { zustandStorage } from './mmkv';

type AppState = {
  activeSessionId: string | null;
  sessions: Record<string, ScanSession>;
  pages: Record<string, ScannedPage>;
  documents: Record<string, ExportedDocument>;
  documentOrder: string[];
  libraryItems: Record<string, LibraryItem>;
  libraryOrder: string[];
  savedFiles: Record<string, SavedFile>;
  settings: AppSettings;
  startSession: (colorMode: ColorMode) => string;
  abandonSession: (sessionId: string) => void;
  completeSession: (sessionId: string) => void;
  addPage: (page: Omit<ScannedPage, 'pageIndex' | 'createdAt'> & { createdAt?: string }) => void;
  updatePage: (pageId: string, patch: Partial<ScannedPage>) => void;
  removePage: (pageId: string) => void;
  reorderSessionPages: (sessionId: string, pageIds: string[]) => void;
  upsertSavedFile: (file: SavedFile) => void;
  deleteSavedFile: (fileId: string) => void;
  upsertLibraryItem: (item: LibraryItem) => void;
  deleteLibraryItem: (itemId: string) => void;
  upsertDocument: (document: ExportedDocument) => void;
  renameDocument: (documentId: string, name: string) => void;
  deleteDocumentRecord: (documentId: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setActiveSession: (sessionId: string | null) => void;
};

type LegacySettings = {
  defaultPageSize?: AppSettings['defaultPageSize'];
  jpegQuality?: number;
  defaultColorMode?: ColorMode;
};

type LegacyPage = Partial<ScannedPage> & {
  id: string;
  sessionId: string;
  width?: number;
  height?: number;
  pageIndex?: number;
  filterMode?: ColorMode;
  originalImagePath?: string;
  processedImagePath?: string;
  thumbnailPath?: string;
  cropPoints?: ScannedPage['cropPoints'];
  createdAt?: string;
};

type LegacyDocument = {
  id: string;
  sessionId: string;
  name: string;
  pdfPath?: string | null;
  docxPath?: string | null;
  pageCount: number;
  createdAt: string;
};

type PersistedSnapshot = Partial<AppState> & {
  settings?: LegacySettings | AppSettings;
  pages?: Record<string, LegacyPage>;
  documents?: Record<string, LegacyDocument | ExportedDocument>;
};

type StoreData = Pick<
  AppState,
  | 'activeSessionId'
  | 'sessions'
  | 'pages'
  | 'documents'
  | 'documentOrder'
  | 'libraryItems'
  | 'libraryOrder'
  | 'savedFiles'
  | 'settings'
>;

const defaultSettings: AppSettings = {
  defaultPageSize: 'A4',
  jpegQuality: 88,
  defaultColorMode: 'color',
  defaultSaveRoot: 'Documents/Kaagaz',
  rememberExportFolder: false,
  preferredTreeUri: null,
  autoCompressOnSave: true,
  defaultCompressionPreset: 'visually-lossless',
  pdfImageQuality: 84,
  imageMaxLongEdge: 2560,
  keepOriginals: true,
  preferredOcrScript: 'latin',
  keepOcrCache: true,
  showOcrOnExport: true,
};

function normalizePage(page: LegacyPage): ScannedPage {
  const width = page.width ?? 1240;
  const height = page.height ?? 1754;

  return {
    id: page.id,
    sessionId: page.sessionId,
    originalImagePath: page.originalImagePath ?? '',
    processedImagePath: page.processedImagePath ?? '',
    thumbnailPath: page.thumbnailPath ?? page.processedImagePath ?? '',
    pageIndex: page.pageIndex ?? 0,
    cropPoints:
      page.cropPoints ??
      [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
    width,
    height,
    aspectRatio: width / Math.max(height, 1),
    rotationDeg: page.rotationDeg ?? 0,
    processingStatus: page.processingStatus ?? 'ready',
    processingError: page.processingError,
    filterMode: page.filterMode ?? 'color',
    sourceCaptureMode: page.sourceCaptureMode ?? 'scanner',
    createdAt: page.createdAt ?? new Date().toISOString(),
  };
}

function createSavedFileFromLegacy(
  document: LegacyDocument,
  role: SavedFileRole,
  path: string | null | undefined,
): SavedFile | null {
  if (!path) {
    return null;
  }

  const extension = role === 'pdf' ? 'pdf' : 'docx';
  const mimeType =
    role === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  return {
    id: createId(`file-${role}`),
    role,
    mimeType,
    path,
    uri: null,
    displayName: `${document.name}.${extension}`,
    relativePath: null,
    sizeBytes: null,
    storageLocation: 'app',
    createdAt: document.createdAt,
    sourceFileId: null,
    previewPath: null,
    pageCount: document.pageCount,
    ocrEnabled: false,
    ocrScript: null,
    searchable: false,
  };
}

function deriveLibraryKind(document: ExportedDocument): LibraryItemKind {
  if (document.pdfFileId && document.docxFileId) {
    return 'scan';
  }

  if (document.imageFileIds.length > 0 && !document.pdfFileId && !document.docxFileId) {
    return 'image-set';
  }

  if (document.pdfFileId) {
    return 'pdf';
  }

  if (document.docxFileId) {
    return 'docx';
  }

  return 'scan';
}

function buildDocumentLibraryItem(
  document: ExportedDocument,
  pages: Record<string, ScannedPage>,
  sessions: Record<string, ScanSession>,
): LibraryItem {
  const session = sessions[document.sessionId];
  const thumbnailPath =
    session?.pageIds.map((pageId) => pages[pageId]?.thumbnailPath).find(Boolean) ?? null;
  const fileIds = [
    document.pdfFileId,
    document.docxFileId,
    document.textFileId,
    ...document.imageFileIds,
  ].filter(Boolean) as string[];

  return {
    id: document.libraryItemId ?? createId('library'),
    kind: deriveLibraryKind(document),
    sourceTool: 'scanner',
    name: document.name,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    pageCount: document.pageCount,
    thumbnailPath,
    sessionId: document.sessionId,
    fileIds,
  };
}

function migrateSnapshot(snapshot: PersistedSnapshot | undefined): StoreData {
  if (!snapshot) {
    return {
      activeSessionId: null,
      sessions: {},
      pages: {},
      documents: {},
      documentOrder: [],
      libraryItems: {},
      libraryOrder: [],
      savedFiles: {},
      settings: defaultSettings,
    };
  }

  const sessions = snapshot.sessions ?? {};
  const pages = Object.fromEntries(
    Object.entries(snapshot.pages ?? {}).map(([pageId, page]) => [pageId, normalizePage(page)]),
  );

  const savedFiles: Record<string, SavedFile> = {};
  const documents: Record<string, ExportedDocument> = {};
  const libraryItems: Record<string, LibraryItem> = {};

  Object.values(snapshot.documents ?? {}).forEach((entry) => {
    const legacyDocument = entry as LegacyDocument;
    const pdfFile =
      'pdfFileId' in entry && (entry as ExportedDocument).pdfFileId
        ? null
        : createSavedFileFromLegacy(legacyDocument, 'pdf', legacyDocument.pdfPath);
    const docxFile =
      'docxFileId' in entry && (entry as ExportedDocument).docxFileId
        ? null
        : createSavedFileFromLegacy(legacyDocument, 'docx', legacyDocument.docxPath);

    if (pdfFile) {
      savedFiles[pdfFile.id] = pdfFile;
    }
    if (docxFile) {
      savedFiles[docxFile.id] = docxFile;
    }

    const document: ExportedDocument =
      'updatedAt' in entry
        ? {
            ...(entry as ExportedDocument),
            updatedAt: (entry as ExportedDocument).updatedAt ?? legacyDocument.createdAt,
            libraryItemId: (entry as ExportedDocument).libraryItemId ?? null,
            pdfFileId:
              (entry as ExportedDocument).pdfFileId ?? pdfFile?.id ?? null,
            docxFileId:
              (entry as ExportedDocument).docxFileId ?? docxFile?.id ?? null,
            imageFileIds: (entry as ExportedDocument).imageFileIds ?? [],
            textFileId: (entry as ExportedDocument).textFileId ?? null,
            ocrStatus: (entry as ExportedDocument).ocrStatus ?? 'idle',
            ocrScript: (entry as ExportedDocument).ocrScript ?? null,
            ocrCachePath: (entry as ExportedDocument).ocrCachePath ?? null,
          }
        : {
            id: legacyDocument.id,
            sessionId: legacyDocument.sessionId,
            name: legacyDocument.name,
            pageCount: legacyDocument.pageCount,
            createdAt: legacyDocument.createdAt,
            updatedAt: legacyDocument.createdAt,
            libraryItemId: null,
            pdfFileId: pdfFile?.id ?? null,
            docxFileId: docxFile?.id ?? null,
            imageFileIds: [],
            textFileId: null,
            ocrStatus: 'idle',
            ocrScript: null,
            ocrCachePath: null,
          };

    const libraryItem = buildDocumentLibraryItem(document, pages, sessions);
    documents[document.id] = { ...document, libraryItemId: libraryItem.id };
    libraryItems[libraryItem.id] = libraryItem;
  });

  const settings = snapshot.settings ?? {};

  return {
    activeSessionId: snapshot.activeSessionId ?? null,
    sessions,
    pages,
    documents,
    documentOrder: snapshot.documentOrder ?? Object.keys(documents),
    libraryItems,
    libraryOrder:
      snapshot.libraryOrder ?? Object.values(libraryItems).map((item) => item.id),
    savedFiles: {
      ...savedFiles,
      ...Object.fromEntries(
        Object.entries(snapshot.savedFiles ?? {}).map(([fileId, file]) => [
          fileId,
          {
            previewPath: null,
            pageCount: null,
            ocrEnabled: false,
            ocrScript: null,
            searchable: false,
            ...file,
          },
        ]),
      ),
    },
    settings: {
      ...defaultSettings,
      ...settings,
    },
  };
}

const initialState = migrateSnapshot(undefined);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      startSession: (colorMode) => {
        const sessionId = createId('session');
        const session: ScanSession = {
          id: sessionId,
          createdAt: new Date().toISOString(),
          colorMode,
          pageIds: [],
          status: 'active',
        };

        set((state) => ({
          activeSessionId: sessionId,
          sessions: {
            ...state.sessions,
            [sessionId]: session,
          },
        }));

        return sessionId;
      },
      abandonSession: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }

        set((state) => ({
          activeSessionId:
            state.activeSessionId === sessionId ? null : state.activeSessionId,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              status: 'abandoned',
            },
          },
        }));
      },
      completeSession: (sessionId) => {
        const session = get().sessions[sessionId];
        if (!session) {
          return;
        }

        set((state) => ({
          activeSessionId:
            state.activeSessionId === sessionId ? null : state.activeSessionId,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              status: 'completed',
            },
          },
        }));
      },
      addPage: (page) => {
        const session = get().sessions[page.sessionId];
        if (!session) {
          return;
        }

        const nextIds = [...session.pageIds, page.id];

        set((state) => ({
          sessions: {
            ...state.sessions,
            [page.sessionId]: {
              ...session,
              pageIds: nextIds,
            },
          },
          pages: {
            ...state.pages,
            [page.id]: {
              ...page,
              pageIndex: nextIds.length - 1,
              createdAt: page.createdAt ?? new Date().toISOString(),
            },
          },
        }));
      },
      updatePage: (pageId, patch) => {
        const page = get().pages[pageId];
        if (!page) {
          return;
        }

        set((state) => ({
          pages: {
            ...state.pages,
            [pageId]: {
              ...page,
              ...patch,
            },
          },
        }));
      },
      removePage: (pageId) => {
        const page = get().pages[pageId];
        if (!page) {
          return;
        }

        const nextPages = { ...get().pages };
        delete nextPages[pageId];

        const session = get().sessions[page.sessionId];
        if (!session) {
          return;
        }

        const nextIds = session.pageIds.filter((id) => id !== pageId);

        nextIds.forEach((id, index) => {
          if (nextPages[id]) {
            nextPages[id] = {
              ...nextPages[id],
              pageIndex: index,
            };
          }
        });

        set((state) => ({
          pages: nextPages,
          sessions: {
            ...state.sessions,
            [page.sessionId]: {
              ...session,
              pageIds: nextIds,
            },
          },
        }));
      },
      reorderSessionPages: (sessionId, pageIds) => {
        set((state) => {
          const nextPages = { ...state.pages };

          pageIds.forEach((pageId, index) => {
            if (nextPages[pageId]) {
              nextPages[pageId] = {
                ...nextPages[pageId],
                pageIndex: index,
              };
            }
          });

          return {
            pages: nextPages,
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...state.sessions[sessionId],
                pageIds,
              },
            },
          };
        });
      },
      upsertSavedFile: (file) => {
        set((state) => ({
          savedFiles: {
            ...state.savedFiles,
            [file.id]: file,
          },
        }));
      },
      deleteSavedFile: (fileId) => {
        const nextFiles = { ...get().savedFiles };
        delete nextFiles[fileId];

        set((state) => ({
          savedFiles: nextFiles,
          libraryItems: Object.fromEntries(
            Object.entries(state.libraryItems).map(([itemId, item]) => [
              itemId,
              {
                ...item,
                fileIds: item.fileIds.filter((value) => value !== fileId),
              },
            ]),
          ),
        }));
      },
      upsertLibraryItem: (item) => {
        set((state) => ({
          libraryItems: {
            ...state.libraryItems,
            [item.id]: item,
          },
          libraryOrder: [
            item.id,
            ...state.libraryOrder.filter((existingId) => existingId !== item.id),
          ],
        }));
      },
      deleteLibraryItem: (itemId) => {
        const nextItems = { ...get().libraryItems };
        delete nextItems[itemId];

        set((state) => ({
          libraryItems: nextItems,
          libraryOrder: state.libraryOrder.filter((value) => value !== itemId),
        }));
      },
      upsertDocument: (document) => {
        const libraryItem = buildDocumentLibraryItem(document, get().pages, get().sessions);

        set((state) => ({
          documents: {
            ...state.documents,
            [document.id]: {
              ...document,
              libraryItemId: libraryItem.id,
            },
          },
          documentOrder: [
            document.id,
            ...state.documentOrder.filter((id) => id !== document.id),
          ],
          libraryItems: {
            ...state.libraryItems,
            [libraryItem.id]: libraryItem,
          },
          libraryOrder: [
            libraryItem.id,
            ...state.libraryOrder.filter((id) => id !== libraryItem.id),
          ],
        }));
      },
      renameDocument: (documentId, name) => {
        const document = get().documents[documentId];
        if (!document) {
          return;
        }

        const nextDocument = {
          ...document,
          name,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          documents: {
            ...state.documents,
            [documentId]: nextDocument,
          },
          libraryItems: nextDocument.libraryItemId
            ? {
                ...state.libraryItems,
                [nextDocument.libraryItemId]: {
                  ...state.libraryItems[nextDocument.libraryItemId],
                  name,
                  updatedAt: nextDocument.updatedAt,
                },
              }
            : state.libraryItems,
        }));
      },
      deleteDocumentRecord: (documentId) => {
        const document = get().documents[documentId];
        if (!document) {
          return;
        }

        const nextDocuments = { ...get().documents };
        delete nextDocuments[documentId];

        const nextSessions = { ...get().sessions };
        const nextPages = { ...get().pages };
        const nextFiles = { ...get().savedFiles };
        const nextLibraryItems = { ...get().libraryItems };
        const session = nextSessions[document.sessionId];

        [document.pdfFileId, document.docxFileId, document.textFileId, ...document.imageFileIds].forEach((fileId) => {
          if (fileId) {
            delete nextFiles[fileId];
          }
        });

        if (document.libraryItemId) {
          delete nextLibraryItems[document.libraryItemId];
        }

        if (session) {
          session.pageIds.forEach((pageId) => {
            delete nextPages[pageId];
          });
          delete nextSessions[document.sessionId];
        }

        set((state) => ({
          documents: nextDocuments,
          sessions: nextSessions,
          pages: nextPages,
          savedFiles: nextFiles,
          libraryItems: nextLibraryItems,
          documentOrder: state.documentOrder.filter((id) => id !== documentId),
          libraryOrder: state.libraryOrder.filter((id) => id !== document.libraryItemId),
          activeSessionId:
            state.activeSessionId === document.sessionId ? null : state.activeSessionId,
        }));
      },
      updateSettings: (patch) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...patch,
          },
        }));
      },
      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId });
      },
    }),
    {
      name: 'kaagaz-app-state',
      storage: createJSONStorage(() => zustandStorage),
      version: 3,
      migrate: (persistedState) => migrateSnapshot(persistedState as PersistedSnapshot),
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
        sessions: state.sessions,
        pages: state.pages,
        documents: state.documents,
        documentOrder: state.documentOrder,
        libraryItems: state.libraryItems,
        libraryOrder: state.libraryOrder,
        savedFiles: state.savedFiles,
        settings: state.settings,
      }),
    },
  ),
);

export function getSessionPages(sessionId: string) {
  const state = useAppStore.getState();
  const session = state.sessions[sessionId];
  if (!session) {
    return [];
  }

  return session.pageIds
    .map((id) => state.pages[id])
    .filter(Boolean)
    .sort((left, right) => left.pageIndex - right.pageIndex);
}

export function getDocumentBySessionId(sessionId: string) {
  const state = useAppStore.getState();
  return Object.values(state.documents).find((document) => document.sessionId === sessionId);
}

export function getSavedFilesForDocument(documentId: string) {
  const state = useAppStore.getState();
  const document = state.documents[documentId];
  if (!document) {
    return [];
  }

  return [document.pdfFileId, document.docxFileId, document.textFileId, ...document.imageFileIds]
    .map((fileId) => (fileId ? state.savedFiles[fileId] : null))
    .filter(Boolean) as SavedFile[];
}

export function getLibraryItems() {
  const state = useAppStore.getState();
  return state.libraryOrder
    .map((id) => state.libraryItems[id])
    .filter(Boolean)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function useSessionPages(sessionId: string) {
  return useAppStore(
    useShallow((state) => {
      const session = state.sessions[sessionId];
      if (!session) {
        return [];
      }

      return session.pageIds
        .map((id) => state.pages[id])
        .filter(Boolean)
        .sort((left, right) => left.pageIndex - right.pageIndex);
    }),
  );
}

export function useDocumentSavedFiles(documentId: string) {
  return useAppStore(
    useShallow((state) => {
      const document = state.documents[documentId];
      if (!document) {
        return [];
      }

      return [document.pdfFileId, document.docxFileId, document.textFileId, ...document.imageFileIds]
        .map((fileId) => (fileId ? state.savedFiles[fileId] : null))
        .filter(Boolean) as SavedFile[];
    }),
  );
}

export function useDocumentBySessionId(sessionId: string) {
  return useAppStore(
    (state) =>
      Object.values(state.documents).find((document) => document.sessionId === sessionId) ?? null,
  );
}
