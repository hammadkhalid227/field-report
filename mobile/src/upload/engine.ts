import type { ReportStore, StoredReport } from '../store/types';

export const retryDelayMs = 5000;
export const stallMs = 45000;

export class UploadError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'UploadError';
    this.retryable = retryable;
  }
}

export type UploadPhotoInput = {
  reportClientId: string;
  imageClientId: string;
  position: number;
  filePath: string;
  onProgress: () => void;
};

export type CompleteReportInput = {
  reportClientId: string;
  description: string;
};

export type Transport = {
  uploadPhoto(input: UploadPhotoInput): Promise<{ url: string }>;
  completeReport(input: CompleteReportInput): Promise<{ id: string }>;
};

export type TickOptions = {
  now?: number;
  online?: boolean;
  stallMs?: number;
};

export type TickResult = {
  uploadedIds: string[];
  deferredIds: string[];
  heldIds: string[];
};

function nextReport(reports: StoredReport[], now: number) {
  return reports
    .filter(report => report.status === 'saved' && report.nextAttemptAt <= now)
    .sort((left, right) => left.createdAt - right.createdAt)[0];
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Upload failed';
}

function canRetry(error: unknown) {
  if (error instanceof UploadError) {
    return error.retryable;
  }
  return true;
}

function withStall<T>(
  start: (onProgress: () => void) => Promise<T>,
  limitMs: number,
) {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (settle: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      settle();
    };

    const arm = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        finish(() => {
          reject(new UploadError('The upload stalled', true));
        });
      }, limitMs);
    };

    arm();
    start(arm).then(
      value => finish(() => resolve(value)),
      error => finish(() => reject(error)),
    );
  });
}

async function recoverInterrupted(store: ReportStore, now: number) {
  const reports = await store.list();

  for (const report of reports) {
    if (report.status !== 'uploading') {
      continue;
    }

    await store.update(report.id, {
      status: 'saved',
      nextAttemptAt: now,
    });
  }
}

export async function tick(
  store: ReportStore,
  transport: Transport,
  options: TickOptions = {},
): Promise<TickResult> {
  const now = options.now ?? Date.now();
  const limitMs = options.stallMs ?? stallMs;
  const uploadedIds: string[] = [];
  const deferredIds: string[] = [];
  const heldIds: string[] = [];

  await recoverInterrupted(store, now);

  if (options.online === false) {
    return { uploadedIds, deferredIds, heldIds };
  }

  for (;;) {
    const report = nextReport(await store.list(), now);
    if (!report) {
      return { uploadedIds, deferredIds, heldIds };
    }

    await store.update(report.id, { status: 'uploading' });

    try {
      const photos = [...report.photos].sort(
        (left, right) => left.position - right.position,
      );

      for (const photo of photos) {
        if (photo.remoteUrl) {
          continue;
        }

        const uploaded = await withStall(
          onProgress =>
            transport.uploadPhoto({
              reportClientId: report.id,
              imageClientId: photo.id,
              position: photo.position,
              filePath: photo.localPath,
              onProgress,
            }),
          limitMs,
        );

        await store.update(report.id, {
          photos: [{ id: photo.id, remoteUrl: uploaded.url }],
        });
        photo.remoteUrl = uploaded.url;
      }

      const finished = await withStall(
        () =>
          transport.completeReport({
            reportClientId: report.id,
            description: report.description,
          }),
        limitMs,
      );

      await store.update(report.id, {
        status: 'uploaded',
        serverId: finished.id,
        lastError: null,
      });
      uploadedIds.push(report.id);
    } catch (error) {
      if (!canRetry(error)) {
        await store.update(report.id, {
          status: 'held',
          lastError: errorMessage(error),
        });
        heldIds.push(report.id);
        continue;
      }

      await store.update(report.id, {
        status: 'saved',
        attemptCount: report.attemptCount + 1,
        lastError: errorMessage(error),
        nextAttemptAt: now + retryDelayMs,
      });
      deferredIds.push(report.id);
    }
  }
}
