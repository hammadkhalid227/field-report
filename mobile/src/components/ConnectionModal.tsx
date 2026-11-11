import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { internet_connected, internet_disconnected } from '../assets/svgs';
import { AppIcon } from './AppIcon';

export function ConnectionModal() {
  const [visible, setVisible] = useState(false);
  const [online, setOnline] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected !== false;
      if (!started.current) {
        started.current = true;
        setOnline(connected);
        setVisible(!connected);
        return;
      }

      setOnline(connected);
      setVisible(true);
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      if (connected) {
        hideTimer = setTimeout(() => setVisible(false), 1600);
      }
    });

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      unsubscribe();
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <AppIcon
            xml={online ? internet_connected : internet_disconnected}
            size={72}
            color={online ? '#2F6B4F' : '#8C2F2F'}
          />
          <Text style={styles.title}>
            {online ? 'Back online' : 'No connection'}
          </Text>
          <Text style={styles.body}>
            {online
              ? 'Saved reports will keep sending.'
              : 'Reports stay on this phone and send when the connection returns.'}
          </Text>
          <Pressable onPress={() => setVisible(false)} style={styles.button}>
            <Text style={styles.buttonText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 21, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#F7F6F3',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1C1915',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5C564E',
    textAlign: 'center',
  },
  button: {
    minHeight: 48,
    minWidth: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F6B4F',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
    color: '#F7F6F3',
    fontWeight: '600',
  },
});
