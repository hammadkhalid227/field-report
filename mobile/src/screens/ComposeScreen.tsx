import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { ImagePickerResponse } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { reportStore } from '../store/reportStore';
import { canSave, maxPhotos } from '../compose/canSave';
import {
  cameraAccess,
  galleryAccess,
  openAppSettings,
  type PermissionOutcome,
} from '../compose/permissions';

type Props = NativeStackScreenProps<RootStackParamList, 'Compose'>;

type DraftPhoto = {
  uri: string;
};

function photoUris(response: ImagePickerResponse) {
  const uris: string[] = [];
  for (const asset of response.assets ?? []) {
    if (asset.uri) {
      uris.push(asset.uri);
    }
  }
  return uris;
}

export function ComposeScreen({ navigation }: Props) {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNotice(null);
        setShowSettings(false);
      }
    });
    return () => subscription.remove();
  }, []);

  function addPhotos(uris: string[]) {
    setPhotos(current => {
      const room = maxPhotos - current.length;
      const next = uris.slice(0, room).map(uri => ({ uri }));
      return [...current, ...next];
    });
  }

  function explainPermission(
    kind: 'camera' | 'photos',
    outcome: PermissionOutcome,
  ) {
    if (outcome === 'granted') {
      setNotice(null);
      setShowSettings(false);
      return true;
    }

    const which = kind === 'camera' ? 'The camera' : 'Photos';
    setShowSettings(outcome === 'blocked');
    setNotice(
      outcome === 'blocked'
        ? `${which} is turned off for this app.`
        : `${which} is still needed.`,
    );
    return false;
  }

  async function takePhoto() {
    const outcome = await cameraAccess();
    if (!explainPermission('camera', outcome)) {
      return;
    }

    const response = await launchCamera({
      mediaType: 'photo',
      saveToPhotos: false,
      cameraType: 'back',
    });

    if (response.didCancel) {
      return;
    }

    if (response.errorCode === 'permission') {
      explainPermission('camera', 'blocked');
      return;
    }

    addPhotos(photoUris(response));
  }

  async function choosePhotos() {
    const outcome = await galleryAccess();
    if (!explainPermission('photos', outcome)) {
      return;
    }

    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: Math.max(maxPhotos - photos.length, 1),
    });

    if (response.didCancel) {
      return;
    }

    if (response.errorCode === 'permission') {
      explainPermission('photos', 'blocked');
      return;
    }

    addPhotos(photoUris(response));
  }

  function removePhoto(index: number) {
    setPhotos(current =>
      current.filter((_, photoIndex) => photoIndex !== index),
    );
  }

  async function saveReport() {
    setSaving(true);
    setNotice(null);
    setShowSettings(false);

    try {
      await reportStore.save({
        description,
        photos: photos.map(photo => ({ sourcePath: photo.uri })),
      });
      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save the report.';
      setNotice(message);
    } finally {
      setSaving(false);
    }
  }

  const roomLeft = photos.length < maxPhotos;
  const ready = canSave(description, photos.length) && !saving;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.help}>
            This stays on the phone until it can be sent.
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What did you see?"
            placeholderTextColor="#7A736A"
            multiline
            maxLength={500}
            style={styles.input}
          />

          <Text style={styles.count}>
            {photos.length} of {maxPhotos} photos
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoCard}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <Pressable
                  onPress={() => removePhoto(index)}
                  style={styles.removeButton}
                  hitSlop={8}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <Pressable
            onPress={takePhoto}
            disabled={!roomLeft || saving}
            style={[styles.secondaryButton, !roomLeft && styles.disabled]}
          >
            <Text style={styles.secondaryText}>Take photo</Text>
          </Pressable>
          <Pressable
            onPress={choosePhotos}
            disabled={!roomLeft || saving}
            style={[styles.secondaryButton, !roomLeft && styles.disabled]}
          >
            <Text style={styles.secondaryText}>Choose from gallery</Text>
          </Pressable>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {showSettings ? (
            <Pressable onPress={openAppSettings} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Open Settings</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={saveReport}
            disabled={!ready}
            style={[styles.primaryButton, !ready && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color="#F7F6F3" />
            ) : (
              <Text style={styles.primaryText}>Save on this phone</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F6F3',
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  help: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5C564E',
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#D9D3C8',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    lineHeight: 24,
    color: '#1C1915',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  count: {
    fontSize: 15,
    color: '#5C564E',
  },
  photoCard: {
    marginRight: 12,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: '#E6E1D8',
  },
  removeButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  removeText: {
    color: '#8C2F2F',
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1915',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 17,
    color: '#1C1915',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1915',
    marginTop: 8,
  },
  primaryText: {
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
