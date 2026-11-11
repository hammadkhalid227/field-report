import ReactNativeBlobUtil from 'react-native-blob-util';
import { getApiBaseUrl } from './config';
import { UploadError } from '../upload/engine';
import type { Transport } from '../upload/engine';

export function failureForStatus(status: number, message: string) {
  const retryable = status === 408 || status === 429 || status >= 500;
  return new UploadError(message, retryable);
}

async function errorText(
  readJson: () => Promise<{ error?: string }>,
  fallback: string,
) {
  try {
    const body = await readJson();
    if (body.error) {
      return body.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function filePath(uri: string) {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

export const httpTransport: Transport = {
  async uploadPhoto(input) {
    const task = ReactNativeBlobUtil.fetch(
      'POST',
      `${getApiBaseUrl()}/reports/${input.reportClientId}/images`,
      { 'Content-Type': 'multipart/form-data' },
      [
        { name: 'imageClientId', data: input.imageClientId },
        { name: 'position', data: String(input.position) },
        {
          name: 'file',
          filename: 'photo.jpg',
          type: 'image/jpeg',
          data: ReactNativeBlobUtil.wrap(filePath(input.filePath)),
        },
      ],
    );
    task.uploadProgress(() => {
      input.onProgress();
    });

    let response;
    try {
      response = await task;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The connection dropped.';
      throw new UploadError(message, true);
    }

    const info = response.info();
    if (info.status < 200 || info.status >= 300) {
      throw failureForStatus(
        info.status,
        await errorText(() => response.json(), 'The photo was not accepted.'),
      );
    }

    const body = (await response.json()) as { url: string };
    return { url: body.url };
  },

  async completeReport(input) {
    let response: Response;
    try {
      response = await fetch(
        `${getApiBaseUrl()}/reports/${input.reportClientId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: input.description }),
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The connection dropped.';
      throw new UploadError(message, true);
    }

    if (!response.ok) {
      throw failureForStatus(
        response.status,
        await errorText(() => response.json(), 'The report was not accepted.'),
      );
    }

    const body = (await response.json()) as { id: string };
    return { id: body.id };
  },
};
