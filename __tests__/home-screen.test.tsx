import React from 'react';
import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { HomeScreen } from '../src/features/home/HomeScreen';
import { useAppStore } from '../src/store/useAppStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const initialState = useAppStore.getState();

describe('HomeScreen', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('renders the scanner-first dashboard with recent documents', () => {
    (useNavigation as jest.Mock).mockReturnValue({ navigate: jest.fn() });

    useAppStore.setState(
      (state) => ({
        ...state,
        sessions: {
          ...state.sessions,
          'session-1': {
            id: 'session-1',
            createdAt: '2026-04-08T09:00:00.000Z',
            colorMode: 'bw',
            pageIds: [],
            status: 'completed',
          },
        },
        savedFiles: {
          ...state.savedFiles,
          'file-1': {
            id: 'file-1',
            role: 'pdf',
            mimeType: 'application/pdf',
            path: '/tmp/board-resolution.pdf',
            uri: 'file:///tmp/board-resolution.pdf',
            displayName: 'Board Resolution.pdf',
            relativePath: 'Documents/Kaagaz/PDFs/Board Resolution.pdf',
            sizeBytes: 1024,
            storageLocation: 'documents',
            createdAt: '2026-04-08T09:05:00.000Z',
            sourceFileId: null,
            previewPath: null,
            pageCount: 2,
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
            name: 'Board Resolution',
            pageCount: 2,
            createdAt: '2026-04-08T09:05:00.000Z',
            updatedAt: '2026-04-08T09:05:00.000Z',
            libraryItemId: 'library-1',
            pdfFileId: 'file-1',
            docxFileId: null,
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
      <HomeScreen navigation={{ navigate: jest.fn() } as never} route={undefined as never} />,
    );

    expect(screen.getByLabelText('Kaagaz mark')).toBeTruthy();
    expect(screen.getByText('New Scan')).toBeTruthy();
    expect(screen.getByText('Board Resolution')).toBeTruthy();
    expect(screen.getByText('Quick tools')).toBeTruthy();
    expect(screen.getByText('Ready for official work')).toBeTruthy();
  });
});
