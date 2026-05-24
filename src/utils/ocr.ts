import { OcrLine, OcrPageResult, OcrScript } from '../types/models';

const scriptLabels: Record<OcrScript, string> = {
  latin: 'English / Latin',
  chinese: 'Chinese',
  devanagari: 'Hindi / Devanagari',
  japanese: 'Japanese',
  korean: 'Korean',
};

export function getOcrScriptLabel(script: OcrScript) {
  return scriptLabels[script];
}

export function orderOcrLines(lines: OcrLine[]) {
  return [...lines].sort((left, right) => {
    const verticalDelta = left.bounds.top - right.bounds.top;
    if (Math.abs(verticalDelta) > 0.015) {
      return verticalDelta;
    }

    return left.bounds.left - right.bounds.left;
  });
}

export function buildPlainTextFromOcrPages(pages: OcrPageResult[]) {
  return pages
    .map((page) => {
      const orderedLines = orderOcrLines(page.blocks.flatMap((block) => block.lines))
        .map((line) => line.text.trim())
        .filter(Boolean);

      if (orderedLines.length === 0) {
        return `Page ${page.pageNumber}\n`;
      }

      return `Page ${page.pageNumber}\n${orderedLines.join('\n')}`;
    })
    .join('\n\n');
}
