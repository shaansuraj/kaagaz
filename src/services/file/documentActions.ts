import { SavedFile } from '../../types/models';
import { fileService } from './fileService';

export async function shareSavedFile(file: SavedFile, message?: string) {
  const target = file.uri ?? file.path;
  if (!target) {
    throw new Error('File is not available to share.');
  }

  await fileService.shareFile(target, file.mimeType, file.displayName, message ?? null);
}

export async function openSavedFile(file: SavedFile) {
  const target = file.uri ?? file.path;
  if (!target) {
    throw new Error('File is not available to open.');
  }

  await fileService.openFile(target, file.mimeType);
}

export async function copyTextToClipboard(text: string) {
  if (!text.trim()) {
    throw new Error('There is no text to copy.');
  }

  await fileService.copyText(text);
}
