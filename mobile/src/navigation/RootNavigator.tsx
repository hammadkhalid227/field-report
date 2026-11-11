import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComposeScreen } from '../screens/ComposeScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ServerReportScreen, ServerScreen } from '../screens/ServerScreen';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const screenOptions = {
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#F7F6F3' },
  headerTintColor: '#1C1915',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: '#F7F6F3' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: {
          backgroundColor: '#F7F6F3',
          borderTopColor: '#D9D3C8',
        },
        tabBarActiveTintColor: '#1C1915',
        tabBarInactiveTintColor: '#5C564E',
      }}
    >
      <Tab.Screen
        name="Phone"
        component={HomeScreen}
        options={{ title: 'On this phone' }}
      />
      <Tab.Screen
        name="Server"
        component={ServerScreen}
        options={{ title: 'On the server' }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Compose"
        component={ComposeScreen}
        options={{ title: 'New report' }}
      />
      <Stack.Screen
        name="ServerReport"
        component={ServerReportScreen}
        options={{ title: 'On the server' }}
      />
    </Stack.Navigator>
  );
}
