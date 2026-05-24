import { ScannedPage } from '../types/models';

export function getCameraCancelTarget(existingPageCount: number) {
  return existingPageCount > 0 ? 'review' : 'home';
}

export async function resolveExportImagePaths(
  pages: ScannedPage[],
  pathExists: (path: string) => Promise<boolean>,
) {
  if (pages.length === 0) {
    throw new Error('Add at least one page before exporting.');
  }

  const orderedPages = [...pages].sort((left, right) => left.pageIndex - right.pageIndex);
  const resolvedPaths: string[] = [];

  for (const [index, page] of orderedPages.entries()) {
    if (page.processingStatus === 'processing' || page.processingStatus === 'pending') {
      throw new Error(`Page ${index + 1} is still processing. Wait a moment and try again.`);
    }

    if (page.processingStatus === 'failed') {
      throw new Error(`Page ${index + 1} failed to process. Rescan or remove it before exporting.`);
    }

    const candidates = [page.processedImagePath, page.originalImagePath].filter(Boolean);
    let selectedPath: string | null = null;

    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        selectedPath = candidate;
        break;
      }
    }

    if (!selectedPath) {
      throw new Error(`Page ${index + 1} is missing its image file. Please rescan it.`);
    }

    resolvedPaths.push(selectedPath);
  }

  return resolvedPaths;
}
