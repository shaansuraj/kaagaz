import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppButton } from '../../components/AppButton';
import { ComparePreview } from '../../components/ComparePreview';
import { DocumentRow } from '../../components/DocumentRow';
import { PaperPreview } from '../../components/PaperPreview';
import { PreviewCanvas } from '../../components/PreviewCanvas';
import { ReorderSurface } from '../../components/ReorderSurface';
import { Screen, ScreenHeader } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import {
  SelectionToolbar,
  SelectionToolbarAction,
} from '../../components/SelectionToolbar';
import { getToolDefinition } from '../../constants/tools';
import { palette, radii, spacing, typography } from '../../constants/theme';
import { processImage } from '../../services/cv/imageProcessingService';
import {
  compressPdf,
  extractDocxImages,
  extractPdfPages,
  generateDocx,
  generatePdf,
  generateSearchablePdf,
  inspectPdf,
  mergePdf,
  renderPdfToImages,
  reorderPdf,
} from '../../services/export/exportService';
import { openSavedFile, shareSavedFile } from '../../services/file/documentActions';
import { fileService, visibleFolders } from '../../services/file/fileService';
import { pickerService, PickedFile } from '../../services/file/pickerService';
import {
  createLibraryItem,
  saveSandboxFileToVisibleStorage,
} from '../../services/library/libraryService';
import {
  downloadOcrModel,
  exportOcrText,
  getAvailableOcrModels,
  runOcrOnImages,
} from '../../services/ocr/ocrService';
import { useAppStore } from '../../store/useAppStore';
import {
  CompressionPreset,
  LibraryItemKind,
  OcrScript,
  PreviewItem,
  RootStackParamList,
  SavedFile,
  SavedFileRole,
} from '../../types/models';
import { buildDefaultDocumentName } from '../../utils/date';
import { humanFileSize, sanitizeFileName, toFileUri } from '../../utils/file';
import { createId } from '../../utils/id';
import { getOcrScriptLabel } from '../../utils/ocr';
import {
  estimateCompressedSize,
  getSelectedPageIndices,
  getSelectedPreviewItems,
  invertPreviewSelection,
  orderPreviewItems,
  togglePreviewSelection,
} from '../../utils/toolPreview';
import { getCompressionConfig } from '../../utils/tooling';

type Props = NativeStackScreenProps<RootStackParamList, 'ToolWorkflow'>;

const compressionPresets: CompressionPreset[] = [
  'visually-lossless',
  'balanced',
  'small-size',
];

const ocrScripts: OcrScript[] = ['latin', 'devanagari', 'chinese', 'japanese', 'korean'];

type IconButtonProps = {
  icon: string;
  label: string;
  onPress: () => void;
};

async function readImageSize(path: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    Image.getSize(
      toFileUri(path),
      (width, height) => resolve({ width, height }),
      () => resolve({ width: 1240, height: 1754 }),
    );
  });
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function getDefaultSelection(toolId: Props['route']['params']['toolId'], items: PreviewItem[]) {
  if (toolId === 'extract-first-page') {
    return items.slice(0, 1).map((item) => item.id);
  }

  return items.map((item) => item.id);
}

function getToolFolder(toolId: Props['route']['params']['toolId']) {
  switch (toolId) {
    case 'compress-images':
    case 'compress-pdf':
      return visibleFolders.compressed;
    case 'pdf-merge':
      return visibleFolders.merged;
    case 'images-to-pdf':
    case 'pdf-to-images':
    case 'pdf-to-docx':
    case 'docx-to-pdf':
    case 'pdf-extract':
    case 'pdf-reorder':
    case 'ocr-searchable':
      return visibleFolders.converted;
    case 'extract-first-page':
    case 'scan-to-jpg':
    case 'batch-rotate':
    case 'image-cleanup':
      return visibleFolders.images;
    default:
      return visibleFolders.images;
  }
}

function getToolLibraryKind(toolId: Props['route']['params']['toolId']): LibraryItemKind {
  switch (toolId) {
    case 'compress-images':
    case 'compress-pdf':
      return 'compressed';
    case 'pdf-merge':
      return 'merged';
    case 'scan-to-jpg':
    case 'batch-rotate':
    case 'image-cleanup':
      return 'image-set';
    default:
      return 'converted';
  }
}

function getToolFileRole(toolId: Props['route']['params']['toolId']): SavedFileRole {
  switch (toolId) {
    case 'compress-images':
    case 'compress-pdf':
      return 'compressed';
    case 'pdf-merge':
      return 'merged';
    case 'images-to-pdf':
    case 'pdf-extract':
    case 'pdf-reorder':
    case 'docx-to-pdf':
    case 'ocr-searchable':
      return 'pdf';
    case 'pdf-to-docx':
      return 'docx';
    case 'pdf-to-images':
    case 'extract-first-page':
    case 'batch-rotate':
    case 'image-cleanup':
    case 'scan-to-jpg':
      return 'image';
    default:
      return 'converted';
  }
}

export function ToolWorkflowScreen({ route }: Props) {
  const settings = useAppStore((state) => state.settings);
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [name, setName] = useState(buildDefaultDocumentName(new Date().toISOString()));
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [compareBusy, setCompareBusy] = useState(false);
  const [comparePreviewPath, setComparePreviewPath] = useState<string | null>(null);
  const [cleanupMode, setCleanupMode] = useState<'color' | 'bw'>('color');
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png'>('jpg');
  const [pageSize, setPageSize] = useState(settings.defaultPageSize);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>(
    settings.defaultCompressionPreset,
  );
  const [ocrScript, setOcrScript] = useState<OcrScript>(settings.preferredOcrScript);
  const [ocrOutput, setOcrOutput] = useState<'pdf' | 'text'>('pdf');
  const [ocrModels, setOcrModels] = useState<Awaited<ReturnType<typeof getAvailableOcrModels>> | null>(null);
  const [ocrSourceType, setOcrSourceType] = useState<'images' | 'pdf' | null>(null);
  const [ocrPhase, setOcrPhase] = useState<string | null>(null);
  const [resultFiles, setResultFiles] = useState<SavedFile[]>([]);
  const previewTicketRef = useRef(0);

  const tool = getToolDefinition(route.params.toolId);
  const compression = useMemo(
    () => getCompressionConfig(compressionPreset),
    [compressionPreset],
  );

  const orderedPreviewItems = useMemo(
    () =>
      orderPreviewItems(
        previewItems,
        orderedIds.length > 0 ? orderedIds : previewItems.map((item) => item.id),
      ),
    [orderedIds, previewItems],
  );
  const activeSelectionIds = useMemo(() => {
    if (!tool) {
      return [];
    }

    return tool.selectionMode === 'none'
      ? orderedPreviewItems.map((item) => item.id)
      : selectedIds;
  }, [orderedPreviewItems, selectedIds, tool]);
  const activePreviewItems = useMemo(
    () => getSelectedPreviewItems(orderedPreviewItems, activeSelectionIds),
    [activeSelectionIds, orderedPreviewItems],
  );
  const focusedItem = useMemo(
    () => orderedPreviewItems.find((item) => item.id === focusedId) ?? orderedPreviewItems[0] ?? null,
    [focusedId, orderedPreviewItems],
  );
  const totalInputBytes = useMemo(
    () => pickedFiles.reduce((sum, file) => sum + (file.size ?? 0), 0),
    [pickedFiles],
  );
  const estimatedCompressedBytes = useMemo(() => {
    if (!tool || !['compress-images', 'compress-pdf'].includes(tool.id)) {
      return null;
    }

    return estimateCompressedSize(totalInputBytes, compressionPreset);
  }, [compressionPreset, tool, totalInputBytes]);
  const selectedOcrStatus =
    ocrScript === 'latin' ? 'bundled' : ocrModels?.scripts?.[ocrScript] ?? 'not-installed';

  useEffect(() => {
    if (tool?.id !== 'ocr-searchable') {
      return;
    }

    getAvailableOcrModels()
      .then(setOcrModels)
      .catch(() => {
        setOcrModels(null);
      });
  }, [tool?.id]);

  const applyPreviewSnapshot = useCallback(
    (items: PreviewItem[]) => {
      const selection = tool ? getDefaultSelection(tool.id, items) : [];
      setPreviewItems(items);
      setOrderedIds(items.map((item) => item.id));
      setSelectedIds(selection);
      setFocusedId(items[0]?.id ?? null);
    },
    [tool],
  );

  const loadImagePreviewItems = useCallback(
    async (files: PickedFile[]) => {
      const kind = tool?.id === 'scan-to-jpg' ? 'scan-page' : 'image';
      const items = await Promise.all(
        files.map(async (file, index) => {
          const size = await readImageSize(file.path);
          return {
            id: createId('preview'),
            sourcePath: file.path,
            thumbnailPath: file.path,
            fullPreviewPath: file.path,
            kind,
            pageNumber: index + 1,
            width: size.width,
            height: size.height,
            rotationDeg: 0,
            selected: true,
            sourceLabel: file.name,
            parentSourceId: file.path,
            parentSourceName: file.name,
          } satisfies PreviewItem;
        }),
      );
      applyPreviewSnapshot(items);
    },
    [applyPreviewSnapshot, tool?.id],
  );

  const loadPdfPagePreviewItems = useCallback(
    async (file: PickedFile, onlyFirstPage = false) => {
      const inspection = await inspectPdf(file.path);
      const pageInfos = onlyFirstPage ? inspection.pages.slice(0, 1) : inspection.pages;
      const placeholders = pageInfos.map((page) => ({
        id: createId('preview'),
        sourcePath: file.path,
        thumbnailPath: null,
        fullPreviewPath: null,
        kind: 'pdf-page' as const,
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        rotationDeg: 0,
        selected: true,
        sourceLabel: `Page ${page.pageNumber}`,
        parentSourceId: file.path,
        parentSourceName: file.name,
      }));

      applyPreviewSnapshot(placeholders);

      const outputDir = await fileService.buildTempDir(`preview-${tool?.id ?? 'pdf'}`);
      const rendered = await renderPdfToImages({
        inputPath: file.path,
        outputDir,
        format: 'jpg',
        quality: 72,
        maxLongEdge: 980,
        pageIndices: onlyFirstPage ? [0] : undefined,
      });

      const items = placeholders.map((placeholder, index) => ({
        ...placeholder,
        sourcePath: rendered[index]?.path ?? placeholder.sourcePath,
        thumbnailPath: rendered[index]?.path ?? null,
        fullPreviewPath: rendered[index]?.path ?? null,
        width: rendered[index]?.width ?? placeholder.width,
        height: rendered[index]?.height ?? placeholder.height,
      }));
      applyPreviewSnapshot(items);
    },
    [applyPreviewSnapshot, tool?.id],
  );

  const loadPdfDocumentPreviewItems = useCallback(
    async (files: PickedFile[]) => {
      const items: PreviewItem[] = [];
      for (const file of files) {
        const inspection = await inspectPdf(file.path);
        const firstPage = inspection.pages[0];
        const outputDir = await fileService.buildTempDir(`merge-preview-${stripExtension(file.name)}`);
        const [rendered] = await renderPdfToImages({
          inputPath: file.path,
          outputDir,
          format: 'jpg',
          quality: 72,
          maxLongEdge: 980,
          pageIndices: [0],
        });
        items.push({
          id: createId('preview'),
          sourcePath: rendered?.path ?? file.path,
          thumbnailPath: rendered?.path ?? null,
          fullPreviewPath: rendered?.path ?? null,
          kind: 'pdf-document',
          pageNumber: 1,
          width: rendered?.width ?? firstPage?.width ?? 1240,
          height: rendered?.height ?? firstPage?.height ?? 1754,
          rotationDeg: 0,
          selected: true,
          sourceLabel: stripExtension(file.name),
          parentSourceId: file.path,
          parentSourceName: file.name,
        });
      }
      applyPreviewSnapshot(items);
    },
    [applyPreviewSnapshot],
  );

  const loadDocxPreviewItems = useCallback(
    async (file: PickedFile) => {
      const outputDir = await fileService.buildTempDir(`docx-preview-${stripExtension(file.name)}`);
      const images = await extractDocxImages({
        inputPath: file.path,
        outputDir,
      });

      const items = images.map((image, index) => ({
        id: createId('preview'),
        sourcePath: image.path,
        thumbnailPath: image.path,
        fullPreviewPath: image.path,
        kind: 'docx-page' as const,
        pageNumber: index + 1,
        width: image.width,
        height: image.height,
        rotationDeg: 0,
        selected: true,
        sourceLabel: `Page ${index + 1}`,
        parentSourceId: file.path,
        parentSourceName: file.name,
      }));
      applyPreviewSnapshot(items);
    },
    [applyPreviewSnapshot],
  );

  const loadOcrPreviewItems = useCallback(
    async (files: PickedFile[]) => {
      const firstMime = files[0]?.mimeType ?? '';
      if (firstMime.includes('pdf')) {
        setOcrSourceType('pdf');
        await loadPdfPagePreviewItems(files[0]);
        return;
      }

      setOcrSourceType('images');
      await loadImagePreviewItems(files);
    },
    [loadImagePreviewItems, loadPdfPagePreviewItems],
  );

  const preparePreview = useCallback(
    async (files: PickedFile[]) => {
      if (!tool) {
        return;
      }

      const ticket = previewTicketRef.current + 1;
      previewTicketRef.current = ticket;
      setPreviewBusy(true);
      setComparePreviewPath(null);
      setResultFiles([]);

      try {
        if (files.length === 0) {
          applyPreviewSnapshot([]);
          return;
        }

        if (files.length === 1) {
          setName(stripExtension(files[0].name) || name);
        } else if (tool.id === 'pdf-merge') {
          setName(`Merged ${buildDefaultDocumentName(new Date().toISOString())}`);
        }

        if (tool.accepts === 'images') {
          await loadImagePreviewItems(files);
        } else if (tool.accepts === 'ocr-sources') {
          await loadOcrPreviewItems(files);
        } else if (tool.accepts === 'pdf') {
          await loadPdfPagePreviewItems(files[0], tool.id === 'extract-first-page');
        } else if (tool.accepts === 'pdfs') {
          await loadPdfDocumentPreviewItems(files);
        } else if (tool.accepts === 'docx') {
          await loadDocxPreviewItems(files[0]);
        }
      } catch (error) {
        if (ticket === previewTicketRef.current) {
          applyPreviewSnapshot([]);
          Alert.alert(
            'Preview unavailable',
            error instanceof Error
              ? error.message
              : 'Kaagaz could not prepare a local preview for this tool.',
          );
        }
      } finally {
        if (ticket === previewTicketRef.current) {
          setPreviewBusy(false);
        }
      }
    },
    [
      applyPreviewSnapshot,
      loadDocxPreviewItems,
      loadImagePreviewItems,
      loadOcrPreviewItems,
      loadPdfDocumentPreviewItems,
      loadPdfPagePreviewItems,
      name,
      tool,
    ],
  );

  const selectFiles = async () => {
    if (!tool) {
      return;
    }

    try {
      let nextFiles: PickedFile[] = [];

      if (tool.accepts === 'images') {
        nextFiles = await pickerService.pickImages();
      } else if (tool.accepts === 'ocr-sources') {
        nextFiles = await pickerService.pickOcrSources();
        const hasPdf = nextFiles.some((file) => file.mimeType?.includes('pdf'));
        const hasImages = nextFiles.some((file) => file.mimeType?.startsWith('image/'));
        if (hasPdf && hasImages) {
          throw new Error('Choose either images or a PDF for OCR, not both together.');
        }
        if (nextFiles.filter((file) => file.mimeType?.includes('pdf')).length > 1) {
          throw new Error('Choose a single PDF or one or more images for OCR.');
        }
      } else if (tool.accepts === 'pdf') {
        nextFiles = [await pickerService.pickSinglePdf()];
      } else if (tool.accepts === 'pdfs') {
        nextFiles = await pickerService.pickManyPdfs();
      } else if (tool.accepts === 'docx') {
        nextFiles = [await pickerService.pickSingleDocx()];
      }

      setPickedFiles(nextFiles);
      await preparePreview(nextFiles);
    } catch (error) {
      if (!pickerService.isCancel(error)) {
        Alert.alert('File selection failed', 'Kaagaz could not read the selected files.');
      }
    }
  };

  const updateItemRotation = useCallback((itemId: string, delta: number) => {
    setPreviewItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, rotationDeg: ((item.rotationDeg + delta) % 360 + 360) % 360 }
          : item,
      ),
    );
  }, []);

  const duplicateItem = useCallback((itemId: string) => {
    setPreviewItems((current) => {
      const index = current.findIndex((item) => item.id === itemId);
      if (index < 0) {
        return current;
      }
      const copy = {
        ...current[index],
        id: createId('preview'),
        selected: true,
        sourceLabel: `${current[index].sourceLabel ?? 'Page'} copy`,
      };
      const next = [...current];
      next.splice(index + 1, 0, copy);
      setOrderedIds(next.map((item) => item.id));
      setSelectedIds((previous) => [...previous, copy.id]);
      setFocusedId(copy.id);
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setPreviewItems((current) => {
      const next = current.filter((item) => item.id !== itemId);
      setOrderedIds(next.map((item) => item.id));
      setSelectedIds((previous) => previous.filter((id) => id !== itemId));
      setFocusedId((previous) => (previous === itemId ? next[0]?.id ?? null : previous));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!tool || !tool.supportsCompare || !focusedItem) {
      setComparePreviewPath(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setCompareBusy(true);
      try {
        const outputPath = await fileService.buildOutputPath(`compare-${focusedItem.id}`, 'jpg');
        const compareInputPath = focusedItem.fullPreviewPath ?? focusedItem.sourcePath;
        const shouldEnhance = tool.id === 'image-cleanup';
        const colorMode = tool.id === 'image-cleanup' ? cleanupMode : 'color';
        await processImage({
          inputPath: compareInputPath,
          outputPath,
          colorMode,
          jpegQuality: compression.jpegQuality,
          maxLongEdge: 1440,
          rotateDegrees: focusedItem.rotationDeg,
          enhance: shouldEnhance,
        });
        if (!cancelled) {
          setComparePreviewPath(outputPath);
        }
      } catch {
        if (!cancelled) {
          setComparePreviewPath(null);
        }
      } finally {
        if (!cancelled) {
          setCompareBusy(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [cleanupMode, compression.jpegQuality, focusedItem, tool]);

  if (!tool) {
    return null;
  }

  const currentAspectRatio = focusedItem
    ? focusedItem.rotationDeg % 180 === 0
      ? focusedItem.width / Math.max(focusedItem.height, 1)
      : focusedItem.height / Math.max(focusedItem.width, 1)
    : 0.72;

  const selectionSummary =
    tool.selectionMode === 'none'
      ? `${orderedPreviewItems.length} ready`
      : `${activePreviewItems.length} selected of ${orderedPreviewItems.length}`;

  const selectionActions: SelectionToolbarAction[] = [];
  if (tool.selectionMode === 'multiple') {
    selectionActions.push(
      {
        key: 'select-all',
        label: 'Select all',
        onPress: () => setSelectedIds(orderedPreviewItems.map((item) => item.id)),
        disabled: orderedPreviewItems.length === 0,
      },
      {
        key: 'clear',
        label: 'Clear',
        onPress: () => setSelectedIds([]),
        disabled: selectedIds.length === 0,
      },
      {
        key: 'invert',
        label: 'Invert',
        onPress: () =>
          setSelectedIds(invertPreviewSelection(orderedPreviewItems, selectedIds)),
        disabled: orderedPreviewItems.length === 0,
      },
    );
  }

  const renderReorderActions = (item: PreviewItem) => {
    if (!['images-to-pdf', 'batch-rotate', 'pdf-reorder'].includes(tool.id)) {
      return null;
    }

    return (
      <>
        <MiniIconButton icon="rotate-left" label="Rotate left" onPress={() => updateItemRotation(item.id, -90)} />
        <MiniIconButton icon="rotate-right" label="Rotate right" onPress={() => updateItemRotation(item.id, 90)} />
        {tool.id === 'images-to-pdf' ? (
          <>
            <MiniIconButton icon="content-copy" label="Duplicate" onPress={() => duplicateItem(item.id)} />
            <MiniIconButton icon="delete-outline" label="Delete" onPress={() => removeItem(item.id)} />
          </>
        ) : null}
      </>
    );
  };

  const saveImageOutputs = async (options: {
    sandboxPaths: string[];
    extension: 'jpg' | 'png';
    role: SavedFileRole;
    relativePath: string;
    libraryKind: LibraryItemKind;
    previewPath?: string | null;
  }) => {
    const visibleFiles: SavedFile[] = [];
    for (const [index, sandboxPath] of options.sandboxPaths.entries()) {
      const displayName = `${sanitizeFileName(name) || 'Kaagaz'}-${String(index + 1).padStart(
        2,
        '0',
      )}.${options.extension}`;
      const visibleFile = await saveSandboxFileToVisibleStorage({
        sandboxPath,
        displayName,
        role: options.role,
        relativePath: options.relativePath,
        mimeType: options.extension === 'png' ? 'image/png' : 'image/jpeg',
        previewPath: sandboxPath,
        pageCount: 1,
      });
      visibleFiles.push(visibleFile);
    }

    createLibraryItem({
      kind: options.libraryKind,
      name: sanitizeFileName(name) || name,
      sourceTool: tool.id,
      pageCount: visibleFiles.length,
      thumbnailPath: options.previewPath ?? options.sandboxPaths[0] ?? null,
      fileIds: visibleFiles.map((file) => file.id),
    });
    setResultFiles(visibleFiles);
    return visibleFiles;
  };

  const materializeRotatedImagePaths = async (items: PreviewItem[]) => {
    const paths: string[] = [];
    for (const item of items) {
      if (item.rotationDeg === 0) {
        paths.push(item.sourcePath);
        continue;
      }

      const outputPath = await fileService.buildOutputPath(`rotate-${item.id}`, 'jpg');
      await processImage({
        inputPath: item.sourcePath,
        outputPath,
        colorMode: 'color',
        jpegQuality: 92,
        rotateDegrees: item.rotationDeg,
        enhance: false,
      });
      paths.push(outputPath);
    }
    return paths;
  };

  const ensureOcrToolReady = async () => {
    if (ocrScript === 'latin') {
      return;
    }

    if (selectedOcrStatus === 'ready') {
      return;
    }

    throw new Error(
      `${getOcrScriptLabel(ocrScript)} OCR is not ready. Download the language pack first.`,
    );
  };

  const saveOcrResultFile = async (options: {
    sandboxPath: string;
    displayName: string;
    mimeType: string;
    role: SavedFileRole;
    relativePath: string;
    pageCount: number;
    previewPath: string | null;
    searchable?: boolean;
  }) => {
    const visibleFile = await saveSandboxFileToVisibleStorage({
      sandboxPath: options.sandboxPath,
      displayName: options.displayName,
      role: options.role,
      relativePath: options.relativePath,
      mimeType: options.mimeType,
      previewPath: options.previewPath,
      pageCount: options.pageCount,
      ocrEnabled: true,
      ocrScript,
      searchable: options.searchable ?? false,
    });
    createLibraryItem({
      kind: 'converted',
      name: sanitizeFileName(name) || name,
      sourceTool: tool.id,
      pageCount: options.pageCount,
      thumbnailPath: options.previewPath,
      fileIds: [visibleFile.id],
    });
    setResultFiles([visibleFile]);
    return visibleFile;
  };

  const runTool = async () => {
    if (pickedFiles.length === 0) {
      Alert.alert('Choose files first', 'Select local files before running this tool.');
      return;
    }

    if (tool.selectionMode !== 'none' && activePreviewItems.length === 0) {
      Alert.alert('Select pages first', 'Choose at least one page or image for this tool.');
      return;
    }

    try {
      setBusy(true);
      setResultFiles([]);

      const cleanName =
        sanitizeFileName(name) || buildDefaultDocumentName(new Date().toISOString());
      const folder = getToolFolder(tool.id);
      const role = getToolFileRole(tool.id);
      const libraryKind = getToolLibraryKind(tool.id);

      if (tool.id === 'ocr-searchable') {
        await ensureOcrToolReady();
        setOcrPhase('Recognizing text');

        let imagePaths: string[] = [];
        let previewPath: string | null =
          activePreviewItems[0]?.fullPreviewPath ?? activePreviewItems[0]?.sourcePath ?? null;

        if (ocrSourceType === 'pdf') {
          const workingDir = await fileService.buildTempDir('ocr-pdf');
          const pageIndices = getSelectedPageIndices(orderedPreviewItems, activeSelectionIds);
          const rendered = await renderPdfToImages({
            inputPath: pickedFiles[0].path,
            outputDir: workingDir,
            format: 'jpg',
            quality: 92,
            maxLongEdge: settings.imageMaxLongEdge,
            pageIndices,
          });
          imagePaths = rendered.map((item) => item.path);
          previewPath = rendered[0]?.path ?? previewPath;
        } else {
          imagePaths = activePreviewItems.map((item) => item.sourcePath);
        }

        const ocrPages = await runOcrOnImages({
          imagePaths,
          script: ocrScript,
        });

        if (!ocrPages.some((page) => page.text.trim().length > 0)) {
          throw new Error('No readable text was recognized from the selected pages.');
        }

        if (ocrOutput === 'text') {
          setOcrPhase('Saving text');
          const sandboxText = await fileService.buildOutputPath(`${cleanName}-${ocrScript}`, 'txt');
          await exportOcrText({
            ocrPages,
            outputPath: sandboxText,
          });
          await saveOcrResultFile({
            sandboxPath: sandboxText,
            displayName: `${cleanName}.txt`,
            mimeType: 'text/plain',
            role: 'text',
            relativePath: visibleFolders.text,
            pageCount: ocrPages.length,
            previewPath,
          });
          setOcrPhase(null);
          return;
        }

        setOcrPhase('Building searchable PDF');
        const sandboxPdf = await fileService.buildOutputPath(cleanName, 'pdf');
        await generateSearchablePdf({
          imagePaths,
          ocrPages,
          outputPath: sandboxPdf,
          documentName: cleanName,
          pageSize,
          createdAt: new Date().toISOString(),
          imageQuality: compression.pdfImageQuality,
          script: ocrScript,
        });
        await saveOcrResultFile({
          sandboxPath: sandboxPdf,
          displayName: `${cleanName}.pdf`,
          mimeType: 'application/pdf',
          role: 'pdf',
          relativePath: visibleFolders.pdfs,
          pageCount: ocrPages.length,
          previewPath,
          searchable: true,
        });
        setOcrPhase(null);
        return;
      }

      if (
        tool.id === 'compress-images' ||
        tool.id === 'image-cleanup' ||
        tool.id === 'batch-rotate' ||
        tool.id === 'scan-to-jpg'
      ) {
        const outputs: string[] = [];
        for (const item of activePreviewItems) {
          const outputPath = await fileService.buildOutputPath(`${cleanName}-${item.id}`, 'jpg');
          await processImage({
            inputPath: item.sourcePath,
            outputPath,
            colorMode: tool.id === 'image-cleanup' ? cleanupMode : 'color',
            jpegQuality: compression.jpegQuality,
            maxLongEdge: compression.maxLongEdge,
            rotateDegrees: item.rotationDeg,
            enhance: tool.id === 'image-cleanup' || tool.id === 'scan-to-jpg',
          });
          outputs.push(outputPath);
        }

        await saveImageOutputs({
          sandboxPaths: outputs,
          extension: 'jpg',
          role,
          relativePath: folder,
          libraryKind,
          previewPath: outputs[0] ?? null,
        });
        return;
      }

      if (tool.id === 'images-to-pdf') {
        const imagePaths = await materializeRotatedImagePaths(activePreviewItems);
        const sandboxPdf = await fileService.buildOutputPath(cleanName, 'pdf');
        await generatePdf({
          imagePaths,
          outputPath: sandboxPdf,
          documentName: cleanName,
          pageSize,
          createdAt: new Date().toISOString(),
          imageQuality: compression.pdfImageQuality,
        });
        const visibleFile = await saveSandboxFileToVisibleStorage({
          sandboxPath: sandboxPdf,
          displayName: `${cleanName}.pdf`,
          role,
          relativePath: folder,
          mimeType: 'application/pdf',
          previewPath:
            activePreviewItems[0]?.fullPreviewPath ?? activePreviewItems[0]?.sourcePath ?? null,
          pageCount: activePreviewItems.length,
        });
        createLibraryItem({
          kind: libraryKind,
          name: cleanName,
          sourceTool: tool.id,
          pageCount: activePreviewItems.length,
          thumbnailPath:
            activePreviewItems[0]?.fullPreviewPath ?? activePreviewItems[0]?.sourcePath ?? null,
          fileIds: [visibleFile.id],
        });
        setResultFiles([visibleFile]);
        return;
      }

      if (tool.id === 'pdf-to-images' || tool.id === 'extract-first-page') {
        const outputDir = await fileService.buildTempDir(tool.id);
        const pageIndices =
          tool.id === 'extract-first-page'
            ? [0]
            : getSelectedPageIndices(orderedPreviewItems, activeSelectionIds);
        const rendered = await renderPdfToImages({
          inputPath: pickedFiles[0].path,
          outputDir,
          format: outputFormat,
          quality: compression.jpegQuality,
          maxLongEdge: compression.maxLongEdge,
          pageIndices,
        });
        await saveImageOutputs({
          sandboxPaths: rendered.map((item) => item.path),
          extension: outputFormat,
          role,
          relativePath: folder,
          libraryKind,
          previewPath: rendered[0]?.path ?? null,
        });
        return;
      }

      if (tool.id === 'compress-pdf') {
        const selectedPageIndices = getSelectedPageIndices(orderedPreviewItems, activeSelectionIds);
        let inputPath = pickedFiles[0].path;
        if (
          selectedPageIndices.length > 0 &&
          selectedPageIndices.length < orderedPreviewItems.length
        ) {
          inputPath = await fileService.buildOutputPath(`${cleanName}-selection`, 'pdf');
          await extractPdfPages({
            inputPath: pickedFiles[0].path,
            outputPath: inputPath,
            pageIndices: selectedPageIndices,
          });
        }
        const sandboxPdf = await fileService.buildOutputPath(cleanName, 'pdf');
        const workingDir = await fileService.buildTempDir('compress-pdf');
        await compressPdf({
          inputPath,
          outputPath: sandboxPdf,
          workingDir,
          pageSize,
          quality: compression.pdfImageQuality,
          maxLongEdge: compression.maxLongEdge,
        });
        const visibleFile = await saveSandboxFileToVisibleStorage({
          sandboxPath: sandboxPdf,
          displayName: `${cleanName}.pdf`,
          role,
          relativePath: folder,
          mimeType: 'application/pdf',
          previewPath: orderedPreviewItems[0]?.fullPreviewPath ?? null,
          pageCount: selectedPageIndices.length || orderedPreviewItems.length,
        });
        createLibraryItem({
          kind: libraryKind,
          name: cleanName,
          sourceTool: tool.id,
          pageCount: selectedPageIndices.length || orderedPreviewItems.length,
          thumbnailPath: orderedPreviewItems[0]?.fullPreviewPath ?? null,
          fileIds: [visibleFile.id],
        });
        setResultFiles([visibleFile]);
        return;
      }

      if (tool.id === 'pdf-merge') {
        const orderedPaths = activePreviewItems.map(
          (item) => item.parentSourceId ?? item.sourcePath,
        );
        const sandboxPdf = await fileService.buildOutputPath(cleanName, 'pdf');
        await mergePdf(orderedPaths, sandboxPdf);
        const visibleFile = await saveSandboxFileToVisibleStorage({
          sandboxPath: sandboxPdf,
          displayName: `${cleanName}.pdf`,
          role,
          relativePath: folder,
          mimeType: 'application/pdf',
          previewPath: activePreviewItems[0]?.fullPreviewPath ?? null,
          pageCount: activePreviewItems.length,
        });
        createLibraryItem({
          kind: libraryKind,
          name: cleanName,
          sourceTool: tool.id,
          pageCount: activePreviewItems.length,
          thumbnailPath: activePreviewItems[0]?.fullPreviewPath ?? null,
          fileIds: [visibleFile.id],
        });
        setResultFiles([visibleFile]);
        return;
      }

      if (tool.id === 'pdf-extract') {
        const sandboxPdf = await fileService.buildOutputPath(cleanName, 'pdf');
        const pageIndices = getSelectedPageIndices(orderedPreviewItems, activeSelectionIds);
        await extractPdfPages({
          inputPath: pickedFiles[0].path,
          outputPath: sandboxPdf,
          pageIndices,
        });
        const visibleFile = await saveSandboxFileToVisibleStorage({
          sandboxPath: sandboxPdf,
          displayName: `${cleanName}.pdf`,
          role,
          relativePath: folder,
          mimeType: 'application/pdf',
          previewPath: activePreviewItems[0]?.fullPreviewPath ?? null,
          pageCount: pageIndices.length,
        });
        createLibraryItem({
          kind: libraryKind,
          name: cleanName,
          sourceTool: tool.id,
          pageCount: pageIndices.length,
          thumbnailPath: activePreviewItems[0]?.fullPreviewPath ?? null,
          fileIds: [visibleFile.id],
        });
        setResultFiles([visibleFile]);
        return;
      }

      if (tool.id === 'pdf-reorder') {
        const sandboxPdf = await fileService.buildOutputPath(cleanName, 'pdf');
        const pageOrder = orderedPreviewItems.map((item) =>
          Math.max((item.pageNumber ?? 1) - 1, 0),
        );
        await reorderPdf({
          inputPath: pickedFiles[0].path,
          outputPath: sandboxPdf,
          pageOrder,
          rotationDeltas: orderedPreviewItems.map((item) => item.rotationDeg),
        });
        const visibleFile = await saveSandboxFileToVisibleStorage({
          sandboxPath: sandboxPdf,
          displayName: `${cleanName}.pdf`,
          role,
          relativePath: folder,
          mimeType: 'application/pdf',
          previewPath: orderedPreviewItems[0]?.fullPreviewPath ?? null,
          pageCount: orderedPreviewItems.length,
        });
        createLibraryItem({
          kind: libraryKind,
          name: cleanName,
          sourceTool: tool.id,
          pageCount: orderedPreviewItems.length,
          thumbnailPath: orderedPreviewItems[0]?.fullPreviewPath ?? null,
          fileIds: [visibleFile.id],
        });
        setResultFiles([visibleFile]);
        return;
      }

      if (tool.id === 'pdf-to-docx') {
        const workingDir = await fileService.buildTempDir('pdf-docx');
        const pageIndices = getSelectedPageIndices(orderedPreviewItems, activeSelectionIds);
        const rendered = await renderPdfToImages({
          inputPath: pickedFiles[0].path,
          outputDir: workingDir,
          format: 'jpg',
          quality: compression.jpegQuality,
          maxLongEdge: compression.maxLongEdge,
          pageIndices,
        });
        const sandboxDocx = await fileService.buildOutputPath(cleanName, 'docx');
        await generateDocx({
          imagePaths: rendered.map((item) => item.path),
          outputPath: sandboxDocx,
          documentName: cleanName,
          createdAt: new Date().toISOString(),
        });
        const visibleFile = await saveSandboxFileToVisibleStorage({
          sandboxPath: sandboxDocx,
          displayName: `${cleanName}.docx`,
          role,
          relativePath: folder,
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          previewPath: rendered[0]?.path ?? null,
          pageCount: rendered.length,
        });
        createLibraryItem({
          kind: libraryKind,
          name: cleanName,
          sourceTool: tool.id,
          pageCount: rendered.length,
          thumbnailPath: rendered[0]?.path ?? null,
          fileIds: [visibleFile.id],
        });
        setResultFiles([visibleFile]);
        return;
      }

      if (tool.id === 'docx-to-pdf') {
        const sandboxPdf = await fileService.buildOutputPath(cleanName, 'pdf');
        const imagePaths = await materializeRotatedImagePaths(activePreviewItems);
        await generatePdf({
          imagePaths,
          outputPath: sandboxPdf,
          documentName: cleanName,
          pageSize,
          createdAt: new Date().toISOString(),
          imageQuality: compression.pdfImageQuality,
        });
        const visibleFile = await saveSandboxFileToVisibleStorage({
          sandboxPath: sandboxPdf,
          displayName: `${cleanName}.pdf`,
          role,
          relativePath: folder,
          mimeType: 'application/pdf',
          previewPath:
            activePreviewItems[0]?.fullPreviewPath ?? activePreviewItems[0]?.sourcePath ?? null,
          pageCount: activePreviewItems.length,
        });
        createLibraryItem({
          kind: libraryKind,
          name: cleanName,
          sourceTool: tool.id,
          pageCount: activePreviewItems.length,
          thumbnailPath:
            activePreviewItems[0]?.fullPreviewPath ?? activePreviewItems[0]?.sourcePath ?? null,
          fileIds: [visibleFile.id],
        });
        setResultFiles([visibleFile]);
      }
    } catch (error) {
      Alert.alert(
        'Tool failed',
        error instanceof Error ? error.message : 'Kaagaz could not complete this job offline.',
      );
    } finally {
      setOcrPhase(null);
      setBusy(false);
    }
  };

  return (
    <Screen
      header={
        <ScreenHeader
          eyebrow={tool.category}
          title={tool.title}
          subtitle={tool.description}
        />
      }
      footer={
        <AppButton
          title={
            previewBusy
              ? 'Preparing preview...'
              : busy
                ? 'Processing...'
                : 'Save Result'
          }
          onPress={runTool}
          loading={busy}
          size="lg"
          disabled={
            pickedFiles.length === 0 ||
            previewBusy ||
            (tool.selectionMode !== 'none' && activePreviewItems.length === 0)
          }
        />
      }>
      <View style={styles.topBar}>
        <AppButton
          title={pickedFiles.length > 0 ? 'Change files' : 'Choose files'}
          onPress={selectFiles}
          tone="tertiary"
          fullWidth={false}
          icon={
            <MaterialCommunityIcons
              color={palette.accent}
              name="folder-open-outline"
              size={18}
            />
          }
        />
        <Text style={styles.selectionSummary}>
          {pickedFiles.length > 0
            ? `${pickedFiles.length} source file${pickedFiles.length === 1 ? '' : 's'}`
            : 'Choose local files to start'}
        </Text>
      </View>

      <SectionCard
        title="Preview"
        caption="Review the actual pages locally before export. Your selection and order are used for the final output.">
        <View style={styles.previewMetaRow}>
          <Text style={styles.previewMetaText}>{selectionSummary}</Text>
          {estimatedCompressedBytes ? (
            <Text style={styles.previewMetaText}>
              Estimated output: {humanFileSize(estimatedCompressedBytes)}
            </Text>
          ) : null}
        </View>
        <SelectionToolbar actions={selectionActions} />

        {tool.supportsCompare && focusedItem ? (
          <View style={styles.previewSection}>
            <ComparePreview
              leftLabel="Original"
              rightLabel={compareBusy ? 'Preparing preview' : 'Processed'}
              leftImagePath={focusedItem.fullPreviewPath ?? focusedItem.sourcePath}
              rightImagePath={
                comparePreviewPath ?? focusedItem.fullPreviewPath ?? focusedItem.sourcePath
              }
              aspectRatio={currentAspectRatio}
              rotationDeg={focusedItem.rotationDeg}
            />
            <PreviewCanvas
              items={orderedPreviewItems}
              previewKind="filmstrip"
              selectionMode={tool.selectionMode}
              focusedId={focusedId}
              selectedIds={activeSelectionIds}
              onFocus={setFocusedId}
              onSelect={(id) =>
                setSelectedIds((current) =>
                  togglePreviewSelection(current, id, tool.selectionMode),
                )
              }
            />
          </View>
        ) : tool.supportsReorder ? (
          <View style={styles.previewSection}>
            {focusedItem ? (
              <PaperPreview
                imagePath={focusedItem.fullPreviewPath ?? focusedItem.sourcePath}
                aspectRatio={currentAspectRatio}
                rotationDeg={focusedItem.rotationDeg}
                label={focusedItem.sourceLabel}
              />
            ) : null}
            <ReorderSurface
              items={orderedPreviewItems}
              focusedId={focusedId}
              onFocus={setFocusedId}
              onReorder={setOrderedIds}
              renderActions={renderReorderActions}
              emptyLabel="Choose files to start arranging pages."
            />
          </View>
        ) : (
          <View style={styles.previewSection}>
            {tool.previewKind !== 'document-stack' && focusedItem ? (
              <PaperPreview
                imagePath={focusedItem.fullPreviewPath ?? focusedItem.sourcePath}
                aspectRatio={currentAspectRatio}
                rotationDeg={focusedItem.rotationDeg}
                label={focusedItem.sourceLabel}
              />
            ) : null}
            <PreviewCanvas
              items={orderedPreviewItems}
              previewKind={tool.previewKind}
              selectionMode={tool.selectionMode}
              focusedId={focusedId}
              selectedIds={activeSelectionIds}
              onFocus={setFocusedId}
              onSelect={(id) =>
                setSelectedIds((current) =>
                  togglePreviewSelection(current, id, tool.selectionMode),
                )
              }
            />
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Output settings"
        caption="Keep the setup short and practical. Kaagaz saves the result to Documents/Kaagaz by default."
        style={styles.section}>
        <View style={styles.optionStack}>
          <OptionGroup label="Output name">
            <TextInput
              accessibilityLabel="Output name"
              onChangeText={setName}
              placeholder="Output name"
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
              value={name}
            />
          </OptionGroup>

          <OptionGroup label="Compression preset">
            <View style={styles.segmentRow}>
              {compressionPresets.map((preset) => (
                <SegmentButton
                  key={preset}
                  label={preset.replace('-', ' ')}
                  selected={compressionPreset === preset}
                  onPress={() => setCompressionPreset(preset)}
                />
              ))}
            </View>
          </OptionGroup>

          {tool.optionSchema.includes('pageSize') ? (
            <OptionGroup label="Page size">
              <View style={styles.segmentRow}>
                {(['A4', 'LETTER'] as const).map((option) => (
                  <SegmentButton
                    key={option}
                    label={option}
                    selected={pageSize === option}
                    onPress={() => setPageSize(option)}
                  />
                ))}
              </View>
            </OptionGroup>
          ) : null}

          {tool.optionSchema.includes('cleanupMode') ? (
            <OptionGroup label="Cleanup mode">
              <View style={styles.segmentRow}>
                {(['color', 'bw'] as const).map((value) => (
                  <SegmentButton
                    key={value}
                    label={value === 'bw' ? 'Black & White' : 'Color'}
                    selected={cleanupMode === value}
                    onPress={() => setCleanupMode(value)}
                  />
                ))}
              </View>
            </OptionGroup>
          ) : null}

          {tool.optionSchema.includes('outputFormat') ? (
            <OptionGroup label="Image format">
              <View style={styles.segmentRow}>
                {(['jpg', 'png'] as const).map((value) => (
                  <SegmentButton
                    key={value}
                    label={value.toUpperCase()}
                    selected={outputFormat === value}
                    onPress={() => setOutputFormat(value)}
                  />
                ))}
              </View>
            </OptionGroup>
          ) : null}

          {tool.optionSchema.includes('ocrScript') ? (
            <OptionGroup label="OCR script">
              <View style={styles.segmentRow}>
                {ocrScripts.map((script) => (
                  <SegmentButton
                    key={script}
                    label={getOcrScriptLabel(script)}
                    selected={ocrScript === script}
                    onPress={() => setOcrScript(script)}
                  />
                ))}
              </View>
              <View style={styles.ocrInfoRow}>
                <Text style={styles.previewMetaText}>
                  {ocrPhase ??
                    (ocrScript === 'latin'
                      ? 'Bundled in app'
                      : selectedOcrStatus === 'ready'
                        ? 'Installed on this device'
                        : 'Download needed for this script')}
                </Text>
                {tool.id === 'ocr-searchable' && ocrScript !== 'latin' ? (
                  <AppButton
                    title={
                      busy
                        ? 'Working...'
                        : selectedOcrStatus === 'ready'
                          ? 'Installed'
                          : 'Download pack'
                    }
                    onPress={async () => {
                      try {
                        const result = await downloadOcrModel(ocrScript);
                        setOcrModels(result);
                      } catch (error) {
                        Alert.alert(
                          'Language pack download failed',
                          error instanceof Error
                            ? error.message
                            : 'Unable to download the OCR language pack.',
                        );
                      }
                    }}
                    tone={selectedOcrStatus === 'ready' ? 'ghost' : 'tertiary'}
                    size="sm"
                    fullWidth={false}
                    disabled={
                      busy ||
                      !ocrModels?.playServicesAvailable ||
                      selectedOcrStatus === 'ready'
                    }
                  />
                ) : null}
              </View>
            </OptionGroup>
          ) : null}

          {tool.optionSchema.includes('ocrOutput') ? (
            <OptionGroup label="OCR output">
              <View style={styles.segmentRow}>
                {(['pdf', 'text'] as const).map((value) => (
                  <SegmentButton
                    key={value}
                    label={value === 'pdf' ? 'Searchable PDF' : 'Plain Text'}
                    selected={ocrOutput === value}
                    onPress={() => setOcrOutput(value)}
                  />
                ))}
              </View>
            </OptionGroup>
          ) : null}
        </View>
      </SectionCard>

      {resultFiles.length > 0 ? (
        <SectionCard
          title="Saved results"
          caption="Already stored locally and ready for open or share."
          style={styles.section}>
          {resultFiles.map((file) => (
            <View key={file.id} style={styles.resultRow}>
              <DocumentRow
                title={file.displayName}
                meta={file.relativePath ?? 'Saved locally'}
                badges={[
                  file.searchable ? 'SEARCHABLE PDF' : file.role.toUpperCase(),
                  ...(file.pageCount
                    ? [`${file.pageCount} page${file.pageCount === 1 ? '' : 's'}`]
                    : []),
                ]}
                thumbnailPath={file.previewPath ?? null}
                onPress={() => openSavedFile(file)}
              />
              <View style={styles.resultActions}>
                <AppButton
                  title="Open"
                  onPress={() => openSavedFile(file)}
                  tone="tertiary"
                  size="sm"
                  fullWidth={false}
                />
                <AppButton
                  title="Share"
                  onPress={() => shareSavedFile(file, file.displayName)}
                  tone="ghost"
                  size="sm"
                  fullWidth={false}
                />
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}
    </Screen>
  );
}

function OptionGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, selected && styles.segmentSelected]}>
      <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function MiniIconButton({ icon, label, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.miniIconButton}>
      <MaterialCommunityIcons color={palette.inkSoft} name={icon} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  selectionSummary: {
    ...typography.small,
    color: palette.inkSoft,
    flex: 1,
    textAlign: 'right',
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewMetaText: {
    ...typography.small,
    color: palette.inkSoft,
  },
  previewSection: {
    gap: spacing.md,
  },
  ocrInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionStack: {
    gap: spacing.lg,
  },
  optionGroup: {
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.bodyStrong,
  },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    color: palette.ink,
    fontFamily: 'sans-serif',
    fontSize: 15,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surface,
  },
  segmentSelected: {
    borderColor: palette.accentStrong,
    backgroundColor: palette.accentSoft,
  },
  segmentLabel: {
    ...typography.small,
    color: palette.ink,
  },
  segmentLabelSelected: {
    color: palette.accent,
    fontFamily: 'sans-serif-medium',
  },
  resultRow: {
    gap: spacing.sm,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  miniIconButton: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.separator,
    backgroundColor: palette.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
