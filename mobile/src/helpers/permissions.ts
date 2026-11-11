import { Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  openSettings,
  request,
  type Permission,
} from 'react-native-permissions';

import type { PermissionOutcome } from '../types/types';

async function allow(permission: Permission): Promise<PermissionOutcome> {
  let status = await check(permission);

  if (status === RESULTS.DENIED) {
    status = await request(permission);
  }

  if (
    status === RESULTS.GRANTED ||
    status === RESULTS.LIMITED ||
    status === RESULTS.UNAVAILABLE
  ) {
    return 'granted';
  }

  if (status === RESULTS.BLOCKED) {
    return 'blocked';
  }

  return 'denied';
}

export function cameraAccess() {
  const permission =
    Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
  return allow(permission);
}

export function galleryAccess() {
  if (Platform.OS === 'ios') {
    return allow(PERMISSIONS.IOS.PHOTO_LIBRARY);
  }

  if (Number(Platform.Version) >= 33) {
    return allow(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
  }

  return allow(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
}

export function openAppSettings() {
  return openSettings();
}
