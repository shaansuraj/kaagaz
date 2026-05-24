import RNFS from 'react-native-fs';

import { kaagazFiles } from '../../types/native-modules';
import { ExportedDocument, SavedFile } from '../../types/models';
import { normalizeFilePath, sanitizeFileName } from '../../utils/file';

const rootPath = `${RNFS.DocumentDirectoryPath}/kaagaz`;
const sessionsPath = `${rootPath}/sessions`;
const importsPath = `${rootPath}/imports`;
const exportsPath = `${rootPath}/exports`;
const tempPath = `${rootPath}/temp`;

export const visibleFolders = {
  scans: 'Kaagaz/Scans',
  pdfs: 'Kaagaz/PDFs',
  docx: 'Kaagaz/DOCX',
  text: 'Kaagaz/Text',
  images: 'Kaagaz/Images',
  compressed: 'Kaagaz/Compressed',
  merged: 'Kaagaz/Merged',
  converted: 'Kaagaz/Converted',
  temp: 'Kaagaz/Temp',
} as const;

async function ensureDir(path: string) {
  const exists = await RNFS.exists(path);
  if (!exists) {
    await RNFS.mkdir(path);
  }
}

async function listRecursiveSize(path: string): Promise<number> {
  const exists = await RNFS.exists(path);
  if (!exists) {
    return 0;
  }

  const entries = await RNFS.readDir(path);
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        return listRecursiveSize(entry.path);
      }

      return entry.size;
    }),
  );

  return sizes.reduce((sum, value) => sum + value, 0);
}

function inferMimeType(path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    case 'png':
      return 'image/png';
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg';
  }
}

export const fileService = {
  getRootPath() {
    return rootPath;
  },
  getVisibleRootLabel() {
    return 'Documents/Kaagaz';
  },
  async prepareWorkspace() {
    await ensureDir(rootPath);
    await ensureDir(sessionsPath);
    await ensureDir(importsPath);
    await ensureDir(exportsPath);
    await ensureDir(tempPath);
  },
  async ensureSessionDirs(sessionId: string) {
    await this.prepareWorkspace();
    await ensureDir(`${sessionsPath}/${sessionId}`);
  },
  async importScannedImage(sessionId: string, sourcePath: string) {
    await this.ensureSessionDirs(sessionId);
    const cleanSource = normalizeFilePath(sourcePath);
    const targetPath = `${sessionsPath}/${sessionId}/original-${Date.now()}.jpg`;
    await RNFS.copyFile(cleanSource, targetPath);
    return targetPath;
  },
  async importPickedFile(fileName: string, sourcePath: string) {
    await this.prepareWorkspace();
    const safeName = sanitizeFileName(fileName) || `import-${Date.now()}`;
    const extension = safeName.includes('.') ? '' : '.bin';
    const targetPath = `${importsPath}/${Date.now()}-${safeName}${extension}`;
    await RNFS.copyFile(normalizeFilePath(sourcePath), targetPath);
    return targetPath;
  },
  async buildProcessedPaths(sessionId: string, pageId: string) {
    await this.ensureSessionDirs(sessionId);
    return {
      processedPath: `${sessionsPath}/${sessionId}/${pageId}-processed.jpg`,
      thumbnailPath: `${sessionsPath}/${sessionId}/${pageId}-thumb.jpg`,
    };
  },
  async buildDerivedImagePaths(prefix: string) {
    await this.prepareWorkspace();
    const safePrefix = sanitizeFileName(prefix) || 'output';
    return {
      imagePath: `${exportsPath}/${safePrefix}-${Date.now()}.jpg`,
      thumbnailPath: `${exportsPath}/${safePrefix}-${Date.now()}-thumb.jpg`,
    };
  },
  async buildTempDir(name: string) {
    await this.prepareWorkspace();
    const dir = `${tempPath}/${sanitizeFileName(name) || 'job'}-${Date.now()}`;
    await ensureDir(dir);
    return dir;
  },
  async buildExportPath(documentId: string, name: string, extension: 'pdf' | 'docx') {
    await this.prepareWorkspace();
    const safeName = sanitizeFileName(name) || 'Kaagaz Document';
    return `${exportsPath}/${safeName}-${documentId}.${extension}`;
  },
  async buildOutputPath(prefix: string, extension: string) {
    await this.prepareWorkspace();
    const safePrefix = sanitizeFileName(prefix) || 'Kaagaz';
    return `${exportsPath}/${safePrefix}-${Date.now()}.${extension}`;
  },
  async buildOcrCachePath(prefix: string) {
    await this.prepareWorkspace();
    const safePrefix = sanitizeFileName(prefix) || 'Kaagaz OCR';
    return `${exportsPath}/${safePrefix}-${Date.now()}.ocr.json`;
  },
  async pathExists(path: string | null | undefined) {
    if (!path) {
      return false;
    }

    return RNFS.exists(normalizeFilePath(path));
  },
  async stat(path: string) {
    return RNFS.stat(normalizeFilePath(path));
  },
  async readText(path: string) {
    return RNFS.readFile(normalizeFilePath(path), 'utf8');
  },
  async writeText(path: string, content: string) {
    return RNFS.writeFile(normalizeFilePath(path), content, 'utf8');
  },
  async deleteIfExists(path: string | null | undefined) {
    if (!path) {
      return;
    }

    const cleanPath = normalizeFilePath(path);
    const exists = await RNFS.exists(cleanPath);
    if (exists) {
      await RNFS.unlink(cleanPath);
    }
  },
  async deleteSession(sessionId: string) {
    await this.deleteIfExists(`${sessionsPath}/${sessionId}`);
  },
  async deleteDocumentFiles(document: ExportedDocument, files: SavedFile[]) {
    await Promise.all(
      files.map((file) => this.deleteIfExists(file.path)),
    );
    await this.deleteSession(document.sessionId);
  },
  async getStorageUsage() {
    await this.prepareWorkspace();
    return listRecursiveSize(rootPath);
  },
  async saveFileToDocuments(options: {
    sourcePath: string;
    relativePath: string;
    displayName: string;
    mimeType?: string;
  }) {
    return kaagazFiles.saveFileToDocuments({
      sourcePath: normalizeFilePath(options.sourcePath),
      relativePath: options.relativePath,
      displayName: options.displayName,
      mimeType: options.mimeType ?? inferMimeType(options.displayName),
    });
  },
  async saveFileToTreeUri(options: {
    sourcePath: string;
    treeUri: string;
    displayName: string;
    mimeType?: string;
  }) {
    return kaagazFiles.saveFileToTreeUri({
      sourcePath: normalizeFilePath(options.sourcePath),
      treeUri: options.treeUri,
      displayName: options.displayName,
      mimeType: options.mimeType ?? inferMimeType(options.displayName),
    });
  },
  async openFile(target: string, mimeType?: string) {
    return kaagazFiles.openFile(target, mimeType);
  },
  async shareFile(target: string, mimeType?: string, title?: string | null, message?: string | null) {
    return kaagazFiles.shareFile(target, mimeType, title, message);
  },
  async copyText(text: string) {
    return kaagazFiles.copyText(text);
  },
};
