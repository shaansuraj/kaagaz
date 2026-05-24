import { useAppStore } from '../src/store/useAppStore';

const initialState = useAppStore.getState();

describe('app store session flow', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('creates a session and keeps page order in sync after reordering', () => {
    const sessionId = useAppStore.getState().startSession('bw');

    useAppStore.getState().addPage({
      id: 'page-1',
      sessionId,
      originalImagePath: '/tmp/original-1.jpg',
      processedImagePath: '/tmp/processed-1.jpg',
      thumbnailPath: '/tmp/thumb-1.jpg',
      cropPoints: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      width: 100,
      height: 200,
      aspectRatio: 0.5,
      rotationDeg: 0,
      processingStatus: 'ready',
      filterMode: 'bw',
      sourceCaptureMode: 'scanner',
    });

    useAppStore.getState().addPage({
      id: 'page-2',
      sessionId,
      originalImagePath: '/tmp/original-2.jpg',
      processedImagePath: '/tmp/processed-2.jpg',
      thumbnailPath: '/tmp/thumb-2.jpg',
      cropPoints: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      width: 100,
      height: 200,
      aspectRatio: 0.5,
      rotationDeg: 0,
      processingStatus: 'ready',
      filterMode: 'bw',
      sourceCaptureMode: 'scanner',
    });

    useAppStore.getState().reorderSessionPages(sessionId, ['page-2', 'page-1']);

    const state = useAppStore.getState();
    expect(state.sessions[sessionId].pageIds).toEqual(['page-2', 'page-1']);
    expect(state.pages['page-2'].pageIndex).toBe(0);
    expect(state.pages['page-1'].pageIndex).toBe(1);
  });

  it('stores exported documents in recency order', () => {
    useAppStore.getState().upsertDocument({
      id: 'doc-1',
      sessionId: 'session-1',
      name: 'First',
      pageCount: 1,
      createdAt: '2026-04-07T10:00:00.000Z',
      updatedAt: '2026-04-07T10:00:00.000Z',
      libraryItemId: null,
      pdfFileId: 'file-1',
      docxFileId: null,
      imageFileIds: [],
      textFileId: null,
      ocrStatus: 'idle',
      ocrScript: null,
      ocrCachePath: null,
    });

    useAppStore.getState().upsertDocument({
      id: 'doc-2',
      sessionId: 'session-2',
      name: 'Second',
      pageCount: 2,
      createdAt: '2026-04-07T11:00:00.000Z',
      updatedAt: '2026-04-07T11:00:00.000Z',
      libraryItemId: null,
      pdfFileId: 'file-2',
      docxFileId: null,
      imageFileIds: [],
      textFileId: null,
      ocrStatus: 'idle',
      ocrScript: null,
      ocrCachePath: null,
    });

    expect(useAppStore.getState().documentOrder).toEqual(['doc-2', 'doc-1']);
  });
});
