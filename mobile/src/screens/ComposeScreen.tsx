import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Modal,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  ComposeScreenProps,
  DraftPhoto,
  PermissionOutcome,
} from '../types/types';
import { camera, gallery } from '../assets/svgs';
import { AppIcon } from '../components/AppIcon';
import { LoadingImage } from '../components/LoadingImage';
import { reportStore } from '../store/reportStore';
import { canSave, maxPhotos } from '../helpers/canSave';
import { compressPhoto, PhotoTooLargeError } from '../helpers/compressPhoto';
import {
  cameraAccess,
  galleryAccess,
  openAppSettings,
} from '../helpers/permissions';

function draftId() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function photoUris(response: ImagePickerResponse) {
  const uris: string[] = [];
  for (const asset of response.assets ?? []) {
    if (asset.uri) {
      uris.push(asset.uri);
    }
  }
  return uris;
}

export function ComposeScreen({ navigation }: ComposeScreenProps) {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNotice(null);
        setShowSettings(false);
      }
    });
    return () => subscription.remove();
  }, []);

  async function prepare(id: string, uri: string) {
    try {
      const compressed = await compressPhoto(uri);
      setPhotos(current =>
        current.map(photo =>
          photo.id === id
            ? { ...photo, uri: compressed, status: 'ready' }
            : photo,
        ),
      );
    } catch (error) {
      setPhotos(current => current.filter(photo => photo.id !== id));
      setNotice(
        error instanceof PhotoTooLargeError
          ? error.message
          : 'Could not prepare that photo.',
      );
    }
  }

  function addPhotos(uris: string[]) {
    const drafts: DraftPhoto[] = [];
    setPhotos(current => {
      const room = maxPhotos - current.length;
      const next = uris.slice(0, room).map(uri => ({
        id: draftId(),
        status: 'preparing' as const,
        uri,
      }));
      drafts.push(...next);
      return [...current, ...next];
    });
    drafts.forEach(photo => {
      prepare(photo.id, photo.uri);
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

  function removePhoto(id: string) {
    setPhotos(current => current.filter(photo => photo.id !== id));
    setOpenPhoto(current =>
      photos.some(photo => photo.id === id && photo.uri === current)
        ? null
        : current,
    );
  }

  async function saveReport() {
    setSaving(true);
    setNotice(null);
    setShowSettings(false);

    try {
      await reportStore.save({
        description,
        photos: photos
          .filter(photo => photo.status === 'ready')
          .map(photo => ({ sourcePath: photo.uri })),
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
  const photosReady = photos.every(photo => photo.status === 'ready');
  const ready = canSave(description, photos.length) && photosReady && !saving;

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
            {photos.map(photo => (
              <View key={photo.id} style={styles.photoCard}>
                <Pressable
                  onPress={() => {
                    if (photo.status === 'ready') {
                      setOpenPhoto(photo.uri);
                    }
                  }}
                >
                  {photo.status === 'ready' ? (
                    <LoadingImage uri={photo.uri} style={styles.photo} />
                  ) : (
                    <View style={styles.preparing}>
                      <ActivityIndicator color="#2F6B4F" />
                      <Text style={styles.preparingText}>Preparing…</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => removePhoto(photo.id)}
                  style={styles.removeButton}
                  hitSlop={8}
                >
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <Pressable
            onPress={takePhoto}
            disabled={!roomLeft || saving}
            style={[styles.secondaryButton, !roomLeft && styles.disabled]}
          >
            <AppIcon xml={camera} size={20} color="#2F6B4F" />
            <Text style={styles.secondaryText}>Take photo</Text>
          </Pressable>
          <Pressable
            onPress={choosePhotos}
            disabled={!roomLeft || saving}
            style={[styles.secondaryButton, !roomLeft && styles.disabled]}
          >
            <AppIcon xml={gallery} size={20} color="#2F6B4F" />
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
        <Modal
          visible={openPhoto !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setOpenPhoto(null)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpenPhoto(null)}>
            {openPhoto ? (
              <LoadingImage
                uri={openPhoto}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </Modal>
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
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F6B4F',
  },
  removeText: {
    color: '#F7F6F3',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: '#E6E1D8',
  },
  preparing: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: '#E6E1D8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  preparingText: {
    fontSize: 12,
    color: '#5C564E',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F6B4F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    fontSize: 17,
    color: '#2F6B4F',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F6B4F',
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 21, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fullImage: {
    width: '100%',
    height: '70%',
    borderRadius: 16,
  },
});
