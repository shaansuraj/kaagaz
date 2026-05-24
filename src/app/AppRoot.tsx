import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';

import AppNavigator from '../navigation/AppNavigator';
import { isDarkTheme, palette } from '../constants/theme';
import { AppProviders } from './providers/AppProviders';

function AppRoot() {
  return (
    <AppProviders>
      <StatusBar
        backgroundColor={palette.canvas}
        barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}

export default AppRoot;
