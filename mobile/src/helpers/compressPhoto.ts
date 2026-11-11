import ReactNativeBlobUtil from 'react-native-blob-util';
import { Image } from 'react-native-compressor';
import type { ManualCompress } from '../types/types';

export const maxPhotoBytes = 5 * 1024 * 1024;

export const compressSteps = [
  { edge: 2048, quality: 0.7 },
  { edge: 1600, quality: 0.6 },
  { edge: 1280, quality: 0.5 },
  { edge: 1024, quality: 0.4 },
] as const;

export class PhotoTooLargeError extends Error {
  constructor() {
    super('This photo is still over 5 MB.');
    this.name = 'PhotoTooLargeError';
  }
}

async function defaultSize(uri: string) {
  const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  const info = await ReactNativeBlobUtil.fs.stat(path);
  return info.size;
}

async function defaultCompress(
  uri: string,
  options: Parameters<ManualCompress>[1],
) {
  return Image.compress(uri, options);
}

export async function compressPhoto(
  uri: string,
  deps?: {
    compress?: ManualCompress;
    sizeOf?: (path: string) => Promise<number>;
  },
) {
  const compress = deps?.compress ?? defaultCompress;
  const sizeOf = deps?.sizeOf ?? defaultSize;
  let current = uri;

  for (const step of compressSteps) {
    current = await compress(current, {
      compressionMethod: 'manual',
      maxWidth: step.edge,
      maxHeight: step.edge,
      quality: step.quality,
      output: 'jpg',
    });

    if ((await sizeOf(current)) <= maxPhotoBytes) {
      return current;
    }
  }

  throw new PhotoTooLargeError();
}
