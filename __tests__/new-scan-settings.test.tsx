import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { NewScanSettingsScreen } from '../src/features/camera/NewScanSettingsScreen';
import { useAppStore } from '../src/store/useAppStore';

const initialState = useAppStore.getState();

describe('NewScanSettingsScreen', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('starts a black and white session and navigates into the scan flow', () => {
    const replace = jest.fn();

    const screen = render(
      <NewScanSettingsScreen
        navigation={{ replace } as never}
        route={{ key: 'NewScanSettings-key', name: 'NewScanSettings' } as never}
      />,
    );

    fireEvent.press(screen.getByText('Black & White'));
    fireEvent.press(screen.getByText('Start Scanning'));

    const state = useAppStore.getState();
    const sessionId = state.activeSessionId;

    expect(sessionId).toBeTruthy();
    expect(state.sessions[sessionId as string].colorMode).toBe('bw');
    expect(replace).toHaveBeenCalledWith('CameraScan', { sessionId, autoOpen: true });
  });
});
