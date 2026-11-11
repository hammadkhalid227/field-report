import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { mobile, server, settings } from '../assets/svgs';
import { AppIcon } from '../components/AppIcon';
import { ConnectionModal } from '../components/ConnectionModal';
import { ComposeScreen } from '../screens/ComposeScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PhoneReportScreen } from '../screens/PhoneReportScreen';
import { ServerReportScreen, ServerScreen } from '../screens/ServerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const screenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#F7F6F3' },
  headerTintColor: '#2F6B4F',
  headerTitleStyle: { fontWeight: '600' as const, color: '#2F6B4F' },
  contentStyle: { backgroundColor: '#F7F6F3' },
};

function PhoneTabIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon xml={mobile} color={color} size={size} />;
}

function ServerTabIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon xml={server} color={color} size={size} />;
}

function SettingsTabIcon({ color, size }: { color: string; size: number }) {
  return <AppIcon xml={settings} color={color} size={size} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: {
          backgroundColor: '#F7F6F3',
          borderTopColor: '#D9D3C8',
        },
        tabBarActiveTintColor: '#2F6B4F',
        tabBarInactiveTintColor: '#5C564E',
      }}
    >
      <Tab.Screen
        name="Phone"
        component={HomeScreen}
        options={{
          title: 'On this phone',
          tabBarIcon: PhoneTabIcon,
        }}
      />
      <Tab.Screen
        name="Server"
        component={ServerScreen}
        options={{
          title: 'On the server',
          tabBarIcon: ServerTabIcon,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: SettingsTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <View style={styles.navigator}>
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
          name="PhoneReport"
          component={PhoneReportScreen}
          options={{ title: 'On this phone' }}
        />
        <Stack.Screen
          name="ServerReport"
          component={ServerReportScreen}
          options={{ title: 'On the server' }}
        />
      </Stack.Navigator>
      <ConnectionModal />
    </View>
  );
}

const styles = StyleSheet.create({
  navigator: {
    flex: 1,
  },
});
