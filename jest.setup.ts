import '@testing-library/jest-native/extend-expect';

const mockMemory = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockMemory.get(key),
    set: (key: string, value: string) => {
      mockMemory.set(key, value);
    },
    remove: (key: string) => {
      mockMemory.delete(key);
      return true;
    },
  }),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock-documents',
  exists: jest.fn(async () => false),
  mkdir: jest.fn(async () => undefined),
  copyFile: jest.fn(async () => undefined),
  unlink: jest.fn(async () => undefined),
  readDir: jest.fn(async () => []),
  readFile: jest.fn(async () => ''),
  writeFile: jest.fn(async () => undefined),
  stat: jest.fn(async () => ({ size: 0 })),
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(async () => undefined),
  },
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

jest.mock('./src/types/native-modules', () => ({
  kaagazImageProcessor: {
    applyCropAndProcess: jest.fn(),
    processImage: jest.fn(),
  },
  kaagazExport: {
    generatePdf: jest.fn(),
    generateDocx: jest.fn(),
    generateSearchablePdf: jest.fn(),
    inspectPdf: jest.fn(),
    renderPdfToImages: jest.fn(),
    mergePdf: jest.fn(),
    extractPdfPages: jest.fn(),
    reorderPdf: jest.fn(),
    compressPdf: jest.fn(),
    docxToPdf: jest.fn(),
    extractDocxImages: jest.fn(),
  },
  kaagazOcr: {
    getAvailableOcrModels: jest.fn(async () => ({
      playServicesAvailable: true,
      supportsDynamicDownload: true,
      scripts: {
        latin: 'bundled',
        chinese: 'not-installed',
        devanagari: 'not-installed',
        japanese: 'not-installed',
        korean: 'not-installed',
      },
    })),
    downloadOcrModel: jest.fn(),
    runOcrOnImages: jest.fn(),
    exportOcrText: jest.fn(),
  },
  kaagazFiles: {
    pickFiles: jest.fn(),
    pickDirectory: jest.fn(),
    saveFileToDocuments: jest.fn(),
    saveFileToTreeUri: jest.fn(),
    openFile: jest.fn(),
    shareFile: jest.fn(),
    copyText: jest.fn(async () => true),
  },
  kaagazPrint: {
    openSystemPrintDialog: jest.fn(),
  },
}));
