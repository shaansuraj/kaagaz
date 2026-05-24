import React from 'react';
import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { ToolsHubScreen } from '../src/features/tools/ToolsHubScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

describe('ToolsHubScreen', () => {
  it('renders offline tool categories and entries', () => {
    (useNavigation as jest.Mock).mockReturnValue({ navigate: jest.fn() });

    const screen = render(
      <ToolsHubScreen navigation={{ navigate: jest.fn() } as never} route={undefined as never} />,
    );

    expect(screen.getByText('Offline utilities')).toBeTruthy();
    expect(screen.getByText('Optimize')).toBeTruthy();
    expect(screen.getByText('Images to PDF')).toBeTruthy();
    expect(screen.getByText('Extract PDF Pages')).toBeTruthy();
  });
});
