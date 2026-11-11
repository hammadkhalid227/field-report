import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { internet_connected, internet_disconnected } from '../assets/svgs';
import { colors } from '../constants/colors';
import { hp, rf, wp } from '../constants/dimmensions';
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
            size={wp(19.2)}
            color={online ? colors.primary : colors.danger}
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
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(6.4),
  },
  sheet: {
    alignSelf: 'stretch',
    backgroundColor: colors.paper,
    borderRadius: wp(5.3),
    padding: wp(6.4),
    alignItems: 'center',
    gap: hp(1.5),
  },
  title: {
    fontSize: rf(22),
    lineHeight: rf(28),
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.muted,
    textAlign: 'center',
  },
  button: {
    minHeight: hp(5.9),
    minWidth: wp(32),
    borderRadius: wp(3.2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginTop: hp(1),
  },
  buttonText: {
    fontSize: rf(17),
    color: colors.paper,
    fontWeight: '600',
  },
});
