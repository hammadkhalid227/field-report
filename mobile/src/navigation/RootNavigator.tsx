import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
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
import type { MainTabParamList, RootStackParamList } from '../types/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const screenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.paper,
  headerTitleStyle: { fontWeight: '600' as const, color: colors.paper },
  contentStyle: { backgroundColor: colors.paper },
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
          backgroundColor: colors.primary,
          borderTopColor: colors.primary,
        },
        tabBarActiveTintColor: colors.paper,
        tabBarInactiveTintColor: colors.tabInactive,
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
          options={{ title: 'Report details' }}
        />
        <Stack.Screen
          name="ServerReport"
          component={ServerReportScreen}
          options={{ title: 'Report details' }}
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
