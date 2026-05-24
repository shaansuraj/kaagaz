import { getCameraCancelTarget, resolveExportImagePaths } from '../src/utils/scanExport';
import { ScannedPage } from '../src/types/models';

function buildPage(overrides: Partial<ScannedPage> = {}): ScannedPage {
  return {
    id: 'page-1',
    sessionId: 'session-1',
    originalImagePath: '/tmp/original.jpg',
    processedImagePath: '/tmp/processed.jpg',
    thumbnailPath: '/tmp/thumb.jpg',
    pageIndex: 0,
    cropPoints: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    width: 1000,
    height: 1400,
    aspectRatio: 1000 / 1400,
    rotationDeg: 0,
    processingStatus: 'ready',
    filterMode: 'color',
    sourceCaptureMode: 'scanner',
    createdAt: '2026-04-09T00:00:00.000Z',
    ...overrides,
  };
}

describe('scan export helpers', () => {
  it('re-opens review when cancelling scanner with existing pages', () => {
    expect(getCameraCancelTarget(2)).toBe('review');
    expect(getCameraCancelTarget(0)).toBe('home');
  });

  it('prefers processed images when export files exist', async () => {
    const page = buildPage();
    const paths = await resolveExportImagePaths([page], async (path) => path === '/tmp/processed.jpg');
    expect(paths).toEqual(['/tmp/processed.jpg']);
  });

  it('falls back to original image when processed file is missing', async () => {
    const page = buildPage();
    const paths = await resolveExportImagePaths([page], async (path) => path === '/tmp/original.jpg');
    expect(paths).toEqual(['/tmp/original.jpg']);
  });

  it('rejects export while a page is still processing', async () => {
    await expect(
      resolveExportImagePaths([buildPage({ processingStatus: 'processing' })], async () => true),
    ).rejects.toThrow('Page 1 is still processing');
  });
});
