import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComposeScreen } from '../screens/ComposeScreen';
import { HomeScreen } from '../screens/HomeScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#F7F6F3' },
        headerTintColor: '#1C1915',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#F7F6F3' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen
        name="Compose"
        component={ComposeScreen}
        options={{ title: 'New report' }}
      />
    </Stack.Navigator>
  );
}
