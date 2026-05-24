import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { palette } from '../constants/theme';
import { CameraScanScreen } from '../features/camera/CameraScanScreen';
import { NewScanSettingsScreen } from '../features/camera/NewScanSettingsScreen';
import { SessionBuilderScreen } from '../features/camera/SessionBuilderScreen';
import { LibraryScreen } from '../features/documents/LibraryScreen';
import { DocumentDetailScreen } from '../features/documents/DocumentDetailScreen';
import { ExportActionScreen } from '../features/export/ExportActionScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PrintPreparationScreen } from '../features/print/PrintPreparationScreen';
import { AboutScreen } from '../features/settings/AboutScreen';
import { PrivacyScreen } from '../features/settings/PrivacyScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { SplashScreen } from '../features/splash/SplashScreen';
import { ToolWorkflowScreen } from '../features/tools/ToolWorkflowScreen';
import { ToolsHubScreen } from '../features/tools/ToolsHubScreen';
import { MainTabParamList, RootStackParamList } from '../types/models';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function renderTabIcon(routeName: keyof MainTabParamList, color: string, size: number) {
  const iconName =
    routeName === 'HomeTab'
      ? 'file-document-edit-outline'
      : routeName === 'ToolsHub'
        ? 'toolbox-outline'
        : 'folder-outline';

  return <MaterialCommunityIcons color={color} name={iconName} size={size} />;
}

function MainTabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.separator,
          height: 68,
          paddingTop: 8,
          paddingBottom: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.28,
        },
        tabBarIcon: ({ color, size }) => renderTabIcon(route.name, color, size),
      })}>
      <Tabs.Screen
        component={HomeScreen}
        name="HomeTab"
        options={{ tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        component={ToolsHubScreen}
        name="ToolsHub"
        options={{ tabBarLabel: 'Tools' }}
      />
      <Tabs.Screen
        component={LibraryScreen}
        name="Library"
        options={{ tabBarLabel: 'Library' }}
      />
    </Tabs.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerTintColor: palette.ink,
        headerStyle: {
          backgroundColor: palette.canvas,
        },
        headerTitleStyle: {
          color: palette.ink,
          fontSize: 17,
          fontWeight: '700',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: palette.canvas,
        },
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
      }}>
      <Stack.Screen component={SplashScreen} name="Splash" options={{ headerShown: false }} />
      <Stack.Screen component={MainTabsNavigator} name="MainTabs" options={{ headerShown: false }} />
      <Stack.Screen component={NewScanSettingsScreen} name="NewScanSettings" options={{ title: 'New Scan' }} />
      <Stack.Screen component={CameraScanScreen} name="CameraScan" options={{ title: 'Scan' }} />
      <Stack.Screen component={SessionBuilderScreen} name="SessionBuilder" options={{ title: 'Review Pages' }} />
      <Stack.Screen component={ExportActionScreen} name="ExportAction" options={{ title: 'Save or Print' }} />
      <Stack.Screen component={PrintPreparationScreen} name="PrintPreparation" options={{ title: 'Print' }} />
      <Stack.Screen component={DocumentDetailScreen} name="DocumentDetail" options={{ title: 'Document' }} />
      <Stack.Screen component={ToolWorkflowScreen} name="ToolWorkflow" options={{ title: 'Tool' }} />
      <Stack.Screen component={SettingsScreen} name="Settings" options={{ title: 'Settings' }} />
      <Stack.Screen component={AboutScreen} name="About" options={{ title: 'About' }} />
      <Stack.Screen component={PrivacyScreen} name="Privacy" options={{ title: 'Privacy' }} />
    </Stack.Navigator>
  );
}

export default AppNavigator;
