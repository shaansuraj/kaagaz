import {
  estimateCompressedSize,
  getSelectedPageIndices,
  invertPreviewSelection,
  orderPreviewItems,
  togglePreviewSelection,
} from '../src/utils/toolPreview';
import { PreviewItem } from '../src/types/models';

const previewItems: PreviewItem[] = [
  {
    id: 'a',
    sourcePath: '/tmp/a.jpg',
    thumbnailPath: '/tmp/a.jpg',
    fullPreviewPath: '/tmp/a.jpg',
    kind: 'pdf-page',
    pageNumber: 1,
    width: 1000,
    height: 1400,
    rotationDeg: 0,
    selected: true,
    sourceLabel: 'Page 1',
  },
  {
    id: 'b',
    sourcePath: '/tmp/b.jpg',
    thumbnailPath: '/tmp/b.jpg',
    fullPreviewPath: '/tmp/b.jpg',
    kind: 'pdf-page',
    pageNumber: 2,
    width: 1000,
    height: 1400,
    rotationDeg: 0,
    selected: true,
    sourceLabel: 'Page 2',
  },
  {
    id: 'c',
    sourcePath: '/tmp/c.jpg',
    thumbnailPath: '/tmp/c.jpg',
    fullPreviewPath: '/tmp/c.jpg',
    kind: 'pdf-page',
    pageNumber: 3,
    width: 1000,
    height: 1400,
    rotationDeg: 0,
    selected: true,
    sourceLabel: 'Page 3',
  },
];

describe('toolPreview utilities', () => {
  it('orders preview items using explicit ids', () => {
    expect(orderPreviewItems(previewItems, ['c', 'a']).map((item) => item.id)).toEqual([
      'c',
      'a',
    ]);
  });

  it('toggles multi and single selection correctly', () => {
    expect(togglePreviewSelection(['a'], 'b', 'multiple')).toEqual(['a', 'b']);
    expect(togglePreviewSelection(['a', 'b'], 'a', 'multiple')).toEqual(['b']);
    expect(togglePreviewSelection(['a'], 'b', 'single')).toEqual(['b']);
  });

  it('maps selected preview items to zero-based page indices in current order', () => {
    expect(getSelectedPageIndices(previewItems, ['c', 'a'])).toEqual([0, 2]);
  });

  it('inverts the current selection against available items', () => {
    expect(invertPreviewSelection(previewItems, ['b'])).toEqual(['a', 'c']);
  });

  it('estimates compressed sizes with smaller presets producing smaller files', () => {
    const sourceBytes = 2_000_000;
    const lossless = estimateCompressedSize(sourceBytes, 'visually-lossless');
    const balanced = estimateCompressedSize(sourceBytes, 'balanced');
    const small = estimateCompressedSize(sourceBytes, 'small-size');

    expect(lossless).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(small);
  });
});
