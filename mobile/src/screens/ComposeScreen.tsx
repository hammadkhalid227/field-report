import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { ImagePickerResponse } from 'react-native-image-picker';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { hp, rf, wp } from '../constants/dimmensions';
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
import { useKeyboardOpen } from '../helpers/useKeyboardOpen';

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
  const headerHeight = useHeaderHeight();
  const keyboardOpen = useKeyboardOpen();
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
    <SafeAreaView edges={keyboardOpen ? [] : ['bottom']} style={styles.screen}>
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
          <Text style={styles.help}>
            This stays on the phone until it can be sent.
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What did you see?"
            placeholderTextColor={colors.placeholder}
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
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.preparingText}>Preparing…</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => removePhoto(photo.id)}
                  style={styles.removeButton}
                  hitSlop={wp(2.1)}
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
            <AppIcon xml={camera} size={rf(20)} color={colors.primary} />
            <Text style={styles.secondaryText}>Take photo</Text>
          </Pressable>
          <Pressable
            onPress={choosePhotos}
            disabled={!roomLeft || saving}
            style={[styles.secondaryButton, !roomLeft && styles.disabled]}
          >
            <AppIcon xml={gallery} size={rf(20)} color={colors.primary} />
            <Text style={styles.secondaryText}>Choose from gallery</Text>
          </Pressable>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {showSettings ? (
            <Pressable onPress={openAppSettings} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            onPress={saveReport}
            disabled={!ready}
            style={[styles.primaryButton, !ready && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.paper} />
            ) : (
              <Text style={styles.primaryText}>Save on this phone</Text>
            )}
          </Pressable>
        </View>
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
    backgroundColor: colors.paper,
  },
  content: {
    paddingTop: hp(2),
    paddingHorizontal: wp(5.3),
    gap: hp(1.5),
    paddingBottom: hp(1.5),
  },
  help: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.muted,
  },
  input: {
    minHeight: hp(14.8),
    borderWidth: wp(0.3),
    borderColor: colors.line,
    borderRadius: wp(3.2),
    padding: wp(3.7),
    fontSize: rf(18),
    lineHeight: rf(24),
    color: colors.ink,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
  count: {
    fontSize: rf(15),
    color: colors.muted,
  },
  photoCard: {
    marginRight: wp(3.2),
  },
  removeButton: {
    position: 'absolute',
    top: wp(1.6),
    right: wp(1.6),
    width: wp(5.9),
    height: wp(5.9),
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  removeText: {
    color: colors.paper,
    fontSize: rf(16),
    lineHeight: rf(18),
    fontWeight: '700',
  },
  photo: {
    width: wp(25.6),
    height: wp(25.6),
    borderRadius: wp(2.7),
    backgroundColor: colors.photo,
  },
  preparing: {
    width: wp(25.6),
    height: wp(25.6),
    borderRadius: wp(2.7),
    backgroundColor: colors.photo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(0.7),
  },
  preparingText: {
    fontSize: rf(12),
    color: colors.muted,
  },
  secondaryButton: {
    minHeight: hp(5.9),
    borderRadius: wp(3.2),
    borderWidth: wp(0.3),
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.1),
    paddingHorizontal: wp(4.3),
    backgroundColor: colors.white,
  },
  secondaryText: {
    fontSize: rf(17),
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: wp(5.3),
    paddingTop: hp(1.5),
    backgroundColor: colors.paper,
  },
  primaryButton: {
    minHeight: hp(6.4),
    borderRadius: wp(3.2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryText: {
    fontSize: rf(17),
    color: colors.paper,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  notice: {
    fontSize: rf(16),
    lineHeight: rf(22),
    color: colors.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(5.3),
  },
  fullImage: {
    alignSelf: 'stretch',
    height: hp(70),
    borderRadius: wp(4.3),
  },
});
