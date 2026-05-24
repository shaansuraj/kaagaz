import { CompressionPreset, ToolId } from '../types/models';

export function getCompressionConfig(preset: CompressionPreset) {
  switch (preset) {
    case 'small-size':
      return {
        jpegQuality: 68,
        pdfImageQuality: 68,
        maxLongEdge: 1800,
      };
    case 'balanced':
      return {
        jpegQuality: 78,
        pdfImageQuality: 78,
        maxLongEdge: 2200,
      };
    case 'visually-lossless':
    default:
      return {
        jpegQuality: 88,
        pdfImageQuality: 84,
        maxLongEdge: 2560,
      };
  }
}

export function parsePageRange(input: string, maxPageCount: number) {
  if (!input.trim()) {
    return [...Array(maxPageCount)].map((_, index) => index);
  }

  const values = new Set<number>();
  input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (part.includes('-')) {
        const [startRaw, endRaw] = part.split('-');
        const start = Number(startRaw);
        const end = Number(endRaw);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) {
          return;
        }
        const low = Math.max(1, Math.min(start, end));
        const high = Math.min(maxPageCount, Math.max(start, end));
        for (let page = low; page <= high; page += 1) {
          values.add(page - 1);
        }
        return;
      }

      const page = Number(part);
      if (Number.isFinite(page) && page > 0 && page <= maxPageCount) {
        values.add(page - 1);
      }
    });

  return [...values].sort((left, right) => left - right);
}

export function parsePageOrder(input: string, maxPageCount: number) {
  if (!input.trim()) {
    return [...Array(maxPageCount)].map((_, index) => index);
  }

  const values: number[] = [];
  input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (part.includes('-')) {
        const [startRaw, endRaw] = part.split('-');
        const start = Number(startRaw);
        const end = Number(endRaw);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) {
          return;
        }
        const step = start <= end ? 1 : -1;
        for (let page = start; step > 0 ? page <= end : page >= end; page += step) {
          if (page > 0 && page <= maxPageCount) {
            values.push(page - 1);
          }
        }
        return;
      }

      const page = Number(part);
      if (Number.isFinite(page) && page > 0 && page <= maxPageCount) {
        values.push(page - 1);
      }
    });

  return values;
}

export function getOutputFolderForTool(toolId: ToolId) {
  switch (toolId) {
    case 'compress-images':
    case 'compress-pdf':
      return 'compressed';
    case 'pdf-merge':
      return 'merged';
    case 'pdf-to-docx':
    case 'docx-to-pdf':
    case 'pdf-to-images':
    case 'images-to-pdf':
      return 'converted';
    default:
      return 'images';
  }
}
