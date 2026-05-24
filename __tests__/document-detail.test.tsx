import React from 'react';
import { render } from '@testing-library/react-native';

import { DocumentDetailScreen } from '../src/features/documents/DocumentDetailScreen';
import { useAppStore } from '../src/store/useAppStore';

const initialState = useAppStore.getState();

describe('DocumentDetailScreen', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('renders saved files, full-page previews, and actions for an exported document', () => {
    useAppStore.setState(
      (state) => ({
        ...state,
        sessions: {
          ...state.sessions,
          'session-1': {
            id: 'session-1',
            createdAt: '2026-04-08T09:00:00.000Z',
            colorMode: 'color',
            pageIds: ['page-1'],
            status: 'completed',
          },
        },
        pages: {
          ...state.pages,
          'page-1': {
            id: 'page-1',
            sessionId: 'session-1',
            originalImagePath: '/tmp/original-1.jpg',
            processedImagePath: '/tmp/processed-1.jpg',
            thumbnailPath: '/tmp/thumb-1.jpg',
            pageIndex: 0,
            cropPoints: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 },
              { x: 0, y: 1 },
            ],
            width: 1200,
            height: 1600,
            aspectRatio: 0.75,
            rotationDeg: 0,
            processingStatus: 'ready',
            filterMode: 'color',
            sourceCaptureMode: 'scanner',
            createdAt: '2026-04-08T09:01:00.000Z',
          },
        },
        savedFiles: {
          ...state.savedFiles,
          'file-pdf': {
            id: 'file-pdf',
            role: 'pdf',
            mimeType: 'application/pdf',
            path: '/tmp/invoice-packet.pdf',
            uri: 'file:///tmp/invoice-packet.pdf',
            displayName: 'Invoice Packet.pdf',
            relativePath: 'Documents/Kaagaz/PDFs/Invoice Packet.pdf',
            sizeBytes: 1024,
            storageLocation: 'documents',
            createdAt: '2026-04-08T09:05:00.000Z',
            sourceFileId: null,
            previewPath: null,
            pageCount: 1,
            ocrEnabled: false,
            ocrScript: null,
            searchable: false,
          },
          'file-docx': {
            id: 'file-docx',
            role: 'docx',
            mimeType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            path: '/tmp/invoice-packet.docx',
            uri: 'file:///tmp/invoice-packet.docx',
            displayName: 'Invoice Packet.docx',
            relativePath: 'Documents/Kaagaz/DOCX/Invoice Packet.docx',
            sizeBytes: 1024,
            storageLocation: 'documents',
            createdAt: '2026-04-08T09:05:00.000Z',
            sourceFileId: null,
            previewPath: null,
            pageCount: 1,
            ocrEnabled: false,
            ocrScript: null,
            searchable: false,
          },
        },
        documents: {
          ...state.documents,
          'doc-1': {
            id: 'doc-1',
            sessionId: 'session-1',
            name: 'Invoice Packet',
            pageCount: 1,
            createdAt: '2026-04-08T09:05:00.000Z',
            updatedAt: '2026-04-08T09:05:00.000Z',
            libraryItemId: 'library-1',
            pdfFileId: 'file-pdf',
            docxFileId: 'file-docx',
            imageFileIds: [],
            textFileId: null,
            ocrStatus: 'idle',
            ocrScript: null,
            ocrCachePath: null,
          },
        },
        documentOrder: ['doc-1'],
      }),
      false,
    );

    const screen = render(
      <DocumentDetailScreen
        navigation={{ navigate: jest.fn(), replace: jest.fn(), reset: jest.fn() } as never}
        route={{
          key: 'DocumentDetail-key',
          name: 'DocumentDetail',
          params: { documentId: 'doc-1' },
        } as never}
      />,
    );

    expect(screen.getByText('Invoice Packet')).toBeTruthy();
    expect(screen.getByText('Saved files')).toBeTruthy();
    expect(screen.getByText('Invoice Packet.pdf')).toBeTruthy();
    expect(screen.getByText('Delete Document')).toBeTruthy();
    expect(screen.getByText('Page 1')).toBeTruthy();
  });
});
