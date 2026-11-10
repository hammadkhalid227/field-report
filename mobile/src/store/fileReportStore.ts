import { StoreError } from './types';
import type {
  FileSystem,
  NewReport,
  ReportStore,
  ReportUpdate,
  StoredPhoto,
  StoredReport,
} from './types';

function createId() {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256),
  );
  bytes[6] = (bytes[6] % 16) + 64;
  bytes[8] = (bytes[8] % 64) + 128;
  const hex = bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function joinPath(root: string, ...parts: string[]) {
  return [root.replace(/\/+$/, ''), ...parts].join('/');
}

export class FileReportStore implements ReportStore {
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly files: FileSystem,
    private readonly root: string,
  ) {}

  save(input: NewReport) {
    return this.run(() => this.saveNow(input));
  }

  list() {
    return this.run(() => this.readAll());
  }

  get(id: string) {
    return this.run(async () => {
      const reports = await this.readAll();
      return reports.find(report => report.id === id) ?? null;
    });
  }

  update(id: string, patch: ReportUpdate) {
    return this.run(() => this.updateNow(id, patch));
  }

  private run<T>(job: () => Promise<T>) {
    const result = this.pending.then(job, job);
    this.pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private queuePath() {
    return joinPath(this.root, 'queue.json');
  }

  private async readAll() {
    const text = await this.files.readText(this.queuePath());
    if (!text) {
      return [];
    }
    return JSON.parse(text) as StoredReport[];
  }

  private async writeAll(reports: StoredReport[]) {
    const tmpPath = joinPath(this.root, 'queue.json.tmp');
    await this.files.writeText(tmpPath, JSON.stringify(reports, null, 2));
    await this.files.move(tmpPath, this.queuePath());
  }

  private async saveNow(input: NewReport) {
    const description = input.description.trim();

    if (!description) {
      throw new StoreError('Description is required');
    }

    if (description.length > 500) {
      throw new StoreError('Description is too long');
    }

    if (input.photos.length < 1) {
      throw new StoreError('A report needs 1 to 5 photos');
    }

    if (input.photos.length > 5) {
      throw new StoreError('A report can hold 5 photos');
    }

    const reports = await this.readAll();
    const id = input.id ?? createId();

    if (reports.some(report => report.id === id)) {
      throw new StoreError('Report already exists');
    }

    const createdAt = Date.now();
    const photos: StoredPhoto[] = [];

    for (let position = 0; position < input.photos.length; position += 1) {
      const photo = input.photos[position];
      const photoId = photo.id ?? createId();
      const localPath = joinPath(this.root, 'reports', id, `${photoId}.jpg`);
      await this.files.copy(photo.sourcePath, localPath);
      photos.push({
        id: photoId,
        position,
        localPath,
        bytes: await this.files.size(localPath),
        remoteUrl: null,
      });
    }

    const report: StoredReport = {
      id,
      description,
      status: 'saved',
      createdAt,
      nextAttemptAt: createdAt,
      attemptCount: 0,
      lastError: null,
      serverId: null,
      photos,
    };

    reports.push(report);
    await this.writeAll(reports);
    return report;
  }

  private async updateNow(id: string, patch: ReportUpdate) {
    const reports = await this.readAll();
    const index = reports.findIndex(report => report.id === id);

    if (index < 0) {
      throw new StoreError('Report not found');
    }

    const current = reports[index];
    const photos = current.photos.map(photo => {
      const next = patch.photos?.find(item => item.id === photo.id);
      if (!next) {
        return photo;
      }
      return { ...photo, remoteUrl: next.remoteUrl };
    });

    const updated: StoredReport = {
      ...current,
      status: patch.status ?? current.status,
      nextAttemptAt: patch.nextAttemptAt ?? current.nextAttemptAt,
      attemptCount: patch.attemptCount ?? current.attemptCount,
      lastError:
        patch.lastError === undefined ? current.lastError : patch.lastError,
      serverId:
        patch.serverId === undefined ? current.serverId : patch.serverId,
      photos,
    };

    reports[index] = updated;
    await this.writeAll(reports);
    return updated;
  }
}
