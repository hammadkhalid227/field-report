import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getApiBaseUrl, setApiBaseUrl } from '../api/config';
import { resetMessage } from '../helpers/resetMessage';
import { reportStore } from '../store/reportStore';
import { setUploadsPaused, whenUploadsIdle } from '../upload/startUploader';

const faultModes = ['off', 'drop', 'refuse', 'reject', 'hang'] as const;

export function SettingsScreen() {
  const [address, setAddress] = useState(getApiBaseUrl());
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  function saveAddress() {
    const next = address.trim();
    if (!next) {
      setNotice('Enter the server address.');
      return;
    }
    setApiBaseUrl(next);
    setAddress(getApiBaseUrl());
    setNotice('Server address saved.');
  }

  async function armFault(mode: (typeof faultModes)[number]) {
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
      setNotice(
        mode === 'off'
          ? 'The next send is normal.'
          : `The next send will ${mode}.`,
      );
    } catch {
      setNotice('The server could not be reached.');
    }
  }

  async function resetPhone() {
    const reports = await reportStore.list();
    const unsent = reports.filter(
      report => report.status !== 'uploaded',
    ).length;

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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Server address</Text>
      <Text style={styles.help}>
        On the emulator use http://10.0.2.2:4000. On a phone, use the computer's
        address.
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

      <Text style={styles.heading}>Connection lab</Text>
      <Text style={styles.help}>
        The next photo send uses the choice below.
      </Text>
      <View style={styles.modes}>
        {faultModes.map(mode => (
          <Pressable
            key={mode}
            onPress={() => armFault(mode)}
            style={styles.modeButton}
          >
            <Text style={styles.secondaryText}>{mode}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.heading}>Reset this phone</Text>
      <Text style={styles.help}>
        This deletes reports saved on this phone. It does not delete reports
        already on the server.
      </Text>
      <Pressable
        onPress={resetPhone}
        disabled={resetting}
        style={[styles.dangerButton, resetting && styles.disabled]}
      >
        <Text style={styles.dangerText}>Reset this phone</Text>
      </Pressable>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1915',
    marginTop: 8,
  },
  help: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5C564E',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D9D3C8',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1C1915',
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F6B4F',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 17,
    color: '#2F6B4F',
  },
  modes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F6B4F',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dangerButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C2F2F',
  },
  dangerText: {
    fontSize: 17,
    color: '#F7F6F3',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  notice: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1915',
  },
});
