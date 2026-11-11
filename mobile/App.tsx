import { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { httpTransport } from './src/api/httpTransport';
import { RootNavigator } from './src/navigation/RootNavigator';
import { reportStore } from './src/store/reportStore';
import { startUploader } from './src/upload/startUploader';

function App() {
  const online = useRef(true);

  useEffect(() => {
    const uploader = startUploader(
      reportStore,
      httpTransport,
      () => online.current,
    );
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected !== false;
      online.current = connected;
      if (connected) {
        uploader.run();
      }
    });

    return () => {
      uploader.stop();
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
