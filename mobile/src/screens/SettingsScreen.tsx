import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { getApiBaseUrl, setApiBaseUrl } from '../api/config';
import { colors } from '../constants/colors';
import { hp, rf, wp } from '../constants/dimmensions';
import { resetMessage } from '../helpers/resetMessage';
import { reportStore } from '../store/reportStore';
import { setUploadsPaused, whenUploadsIdle } from '../upload/startUploader';

const faults = [
  {
    mode: 'off',
    title: 'Normal',
    detail: 'The next send works the usual way.',
  },
  {
    mode: 'drop',
    title: 'Drop',
    detail:
      'The connection breaks during the next send. The report stays on this phone and is tried again.',
  },
  {
    mode: 'refuse',
    title: 'Refuse',
    detail:
      'The server says it is unavailable. The report stays on this phone and is tried again.',
  },
  {
    mode: 'reject',
    title: 'Reject',
    detail:
      'The server refuses the photo. The phone stops trying and keeps the report here.',
  },
  {
    mode: 'hang',
    title: 'Hang',
    detail:
      'The server does not answer. The phone waits, then tries the send again.',
  },
] as const;

export function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const [address, setAddress] = useState(getApiBaseUrl());
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [armed, setArmed] = useState<(typeof faults)[number]['mode'] | null>(
    null,
  );

  function saveAddress() {
    const next = address.trim();
    if (!next) {
      setNotice('Enter the server address.');
      return;
    }
    setApiBaseUrl(next);
    setAddress(getApiBaseUrl());
    setNotice('Server address saved for this visit.');
  }

  async function armFault(mode: (typeof faults)[number]['mode']) {
    const fault = faults.find(item => item.mode === mode);
    try {
      const response = await fetch(`${getApiBaseUrl()}/dev/faults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, times: 1 }),
      });
      if (!response.ok) {
        setNotice('The server did not accept the fault.');
        return;
      }
      setArmed(mode);
      setNotice(fault ? `${fault.title}. ${fault.detail}` : 'Fault saved.');
    } catch {
      setNotice('The server could not be reached.');
    }
  }

  async function resetPhone() {
    const reports = await reportStore.list();
    const unsent = reports.filter(report => report.status !== 'uploaded').length;

    Alert.alert('Reset this phone', resetMessage(unsent), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setResetting(true);
          setUploadsPaused(true);
          whenUploadsIdle()
            .then(() => reportStore.clear())
            .then(() => {
              setNotice('This phone is cleared.');
            })
            .catch(error => {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Could not clear this phone.';
              setNotice(message);
            })
            .finally(() => {
              setUploadsPaused(false);
              setResetting(false);
            });
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.heading}>Server address</Text>
          <Text style={styles.help}>
            The phone sends reports here. On the emulator use
            http://10.0.2.2:4000. On a phone, use this computer's address. A
            restart puts the original address back.
          </Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable onPress={saveAddress} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Save address</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Connection lab</Text>
          <Text style={styles.help}>
            Pick one to change only the next send. After that send, the server
            goes back to normal.
          </Text>
          {faults.map(fault => {
            const selected = armed === fault.mode;
            return (
              <Pressable
                key={fault.mode}
                onPress={() => armFault(fault.mode)}
                style={[styles.fault, selected && styles.faultSelected]}
              >
                <Text style={styles.faultTitle}>{fault.title}</Text>
                <Text style={styles.faultDetail}>{fault.detail}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Reset this phone</Text>
          <Text style={styles.help}>
            This deletes reports saved on this phone, including ones still
            waiting to send. Reports already on the server stay there.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Pressable
          onPress={resetPhone}
          disabled={resetting}
          style={[styles.dangerButton, resetting && styles.disabled]}
        >
          <Text style={styles.dangerText}>
            {resetting ? 'Resetting…' : 'Reset this phone'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    padding: wp(5.3),
    gap: hp(2),
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: wp(4.3),
    borderWidth: wp(0.3),
    borderColor: colors.line,
    padding: wp(4.3),
    gap: hp(1.5),
  },
  heading: {
    fontSize: rf(18),
    lineHeight: rf(24),
    fontWeight: '700',
    color: colors.ink,
  },
  help: {
    fontSize: rf(15),
    lineHeight: rf(21),
    color: colors.muted,
  },
  input: {
    minHeight: hp(5.9),
    borderWidth: wp(0.3),
    borderColor: colors.primary,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(3.7),
    fontSize: rf(16),
    color: colors.ink,
    backgroundColor: colors.white,
  },
  secondaryButton: {
    minHeight: hp(5.9),
    borderRadius: wp(3.2),
    borderWidth: wp(0.3),
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  secondaryText: {
    fontSize: rf(17),
    color: colors.paper,
    fontWeight: '600',
  },
  fault: {
    borderRadius: wp(3.2),
    borderWidth: wp(0.3),
    borderColor: colors.line,
    paddingHorizontal: wp(3.7),
    paddingVertical: hp(1.5),
    gap: hp(0.5),
    backgroundColor: colors.paper,
  },
  faultSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tabInactive,
  },
  faultTitle: {
    fontSize: rf(16),
    lineHeight: rf(22),
    fontWeight: '700',
    color: colors.primary,
  },
  faultDetail: {
    fontSize: rf(14),
    lineHeight: rf(20),
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: wp(5.3),
    paddingTop: hp(1.5),
    paddingBottom: hp(2),
    gap: hp(1.5),
    backgroundColor: colors.paper,
  },
  dangerButton: {
    minHeight: hp(6.4),
    borderRadius: wp(3.2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  dangerText: {
    fontSize: rf(17),
    color: colors.paper,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  notice: {
    fontSize: rf(15),
    lineHeight: rf(21),
    color: colors.ink,
  },
});
