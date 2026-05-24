import { buildPlainTextFromOcrPages, orderOcrLines } from '../src/utils/ocr';

describe('ocr utils', () => {
  it('orders OCR lines top-to-bottom and left-to-right', () => {
    const lines = orderOcrLines([
      {
        text: 'Second',
        bounds: { left: 0.1, top: 0.22, right: 0.4, bottom: 0.3 },
      },
      {
        text: 'First',
        bounds: { left: 0.1, top: 0.1, right: 0.4, bottom: 0.18 },
      },
      {
        text: 'Third',
        bounds: { left: 0.55, top: 0.22, right: 0.8, bottom: 0.3 },
      },
    ]);

    expect(lines.map((line) => line.text)).toEqual(['First', 'Second', 'Third']);
  });

  it('builds plain text output with page breaks', () => {
    const output = buildPlainTextFromOcrPages([
      {
        pageNumber: 1,
        width: 1000,
        height: 1400,
        text: 'Ignored raw page text',
        blocks: [
          {
            text: 'Hello world',
            bounds: { left: 0.1, top: 0.1, right: 0.6, bottom: 0.18 },
            lines: [
              {
                text: 'Hello world',
                bounds: { left: 0.1, top: 0.1, right: 0.6, bottom: 0.18 },
              },
            ],
          },
        ],
      },
      {
        pageNumber: 2,
        width: 1000,
        height: 1400,
        text: 'Ignored raw page text',
        blocks: [
          {
            text: 'Second page',
            bounds: { left: 0.1, top: 0.1, right: 0.6, bottom: 0.18 },
            lines: [
              {
                text: 'Second page',
                bounds: { left: 0.1, top: 0.1, right: 0.6, bottom: 0.18 },
              },
            ],
          },
        ],
      },
    ]);

    expect(output).toContain('Page 1');
    expect(output).toContain('Hello world');
    expect(output).toContain('Page 2');
    expect(output).toContain('Second page');
  });
});
