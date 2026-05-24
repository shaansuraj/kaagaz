import React from 'react';
import { act, render } from '@testing-library/react-native';

import { SessionBuilderScreen } from '../src/features/camera/SessionBuilderScreen';
import { useAppStore } from '../src/store/useAppStore';

jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: ({ data, renderItem }: any) => (
      <View>
        {data.map((item: any, index: number) =>
          ReactLib.createElement(
            ReactLib.Fragment,
            { key: item.id ?? index },
            renderItem({
              item,
              getIndex: () => index,
              drag: jest.fn(),
              isActive: false,
            }),
          ),
        )}
      </View>
    ),
  };
});

const initialState = useAppStore.getState();

describe('SessionBuilderScreen', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('unblocks finishing when all background page processing completes', () => {
    useAppStore.setState(
      (state) => ({
        ...state,
        sessions: {
          ...state.sessions,
          'session-1': {
            id: 'session-1',
            createdAt: '2026-04-08T09:00:00.000Z',
            colorMode: 'color',
            pageIds: ['page-1', 'page-2'],
            status: 'active',
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
          'page-2': {
            id: 'page-2',
            sessionId: 'session-1',
            originalImagePath: '/tmp/original-2.jpg',
            processedImagePath: '/tmp/processed-2.jpg',
            thumbnailPath: '/tmp/thumb-2.jpg',
            pageIndex: 1,
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
            processingStatus: 'processing',
            filterMode: 'color',
            sourceCaptureMode: 'scanner',
            createdAt: '2026-04-08T09:02:00.000Z',
          },
        },
      }),
      false,
    );

    const screen = render(
      <SessionBuilderScreen
        navigation={{ replace: jest.fn() } as never}
        route={{
          key: 'SessionBuilder-key',
          name: 'SessionBuilder',
          params: { sessionId: 'session-1' },
        } as never}
      />,
    );

    expect(screen.getByText('Processing pages...')).toBeTruthy();

    act(() => {
      useAppStore.getState().updatePage('page-2', {
        processingStatus: 'ready',
        processingError: undefined,
      });
    });

    expect(screen.getByText('Finish')).toBeTruthy();
    expect(screen.getByText('Ready to finish')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled();
  });
});
