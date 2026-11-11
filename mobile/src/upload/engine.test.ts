import { tick, retryDelayMs, UploadError } from './engine';
import type { Transport } from './engine';
import { FileReportStore } from '../store/fileReportStore';
import type { FileSystem } from '../store/types';

function createDisk() {
  const files = new Map<string, string>();
  const disk: FileSystem = {
    async readText(path) {
      return files.get(path) ?? null;
    },
    async writeText(path, text) {
      files.set(path, text);
    },
    async move(from, to) {
      const value = files.get(from);
      if (value === undefined) {
        throw new Error(`Missing ${from}`);
      }
      files.set(to, value);
      files.delete(from);
    },
    async copy(from, to) {
      const value = files.get(from);
      if (value === undefined) {
        throw new Error(`Missing ${from}`);
      }
      files.set(to, value);
    },
    async remove(path) {
      files.delete(path);
    },
    async exists(path) {
      return files.has(path);
    },
    async mkdir() {},
    async size(path) {
      const value = files.get(path);
      if (value === undefined) {
        throw new Error(`Missing ${path}`);
      }
      return value.length;
    },
  };

  files.set('/camera/one.jpg', 'one');
  files.set('/camera/two.jpg', 'two');
  return new FileReportStore(disk, '/phone');
}

function fakeTransport(failAtPhoto?: number): Transport & { calls: string[] } {
  const calls: string[] = [];
  let photoCalls = 0;

  return {
    calls,
    async uploadPhoto(input) {
      photoCalls += 1;
      if (failAtPhoto === photoCalls) {
        throw new Error('connection dropped');
      }
      calls.push(`photo:${input.imageClientId}`);
      return { url: `https://cdn.example/${input.imageClientId}.jpg` };
    },
    async completeReport(input) {
      calls.push(`complete:${input.reportClientId}`);
      return { id: `server-${input.reportClientId}` };
    },
  };
}

async function waitForNextMillisecond() {
  const start = Date.now();
  while (Date.now() === start) {
    await new Promise<void>(resolve => {
      setTimeout(resolve, 1);
    });
  }
}

describe('upload engine', () => {
  it('uploads each photo once, then finishes the report', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Crack in the stair',
      photos: [
        { sourcePath: '/camera/one.jpg' },
        { sourcePath: '/camera/two.jpg' },
      ],
    });
    const transport = fakeTransport();

    const result = await tick(store, transport, { now: Date.now() });
    const stored = await store.get(saved.id);

    expect(result.uploadedIds).toEqual([saved.id]);
    expect(transport.calls).toEqual([
      `photo:${saved.photos[0].id}`,
      `photo:${saved.photos[1].id}`,
      `complete:${saved.id}`,
    ]);
    expect(stored?.status).toBe('uploaded');
    expect(stored?.serverId).toBe(`server-${saved.id}`);
    expect(stored?.photos.map(photo => photo.remoteUrl)).toEqual([
      `https://cdn.example/${saved.photos[0].id}.jpg`,
      `https://cdn.example/${saved.photos[1].id}.jpg`,
    ]);
  });

  it('sends the older report first', async () => {
    const store = createDisk();
    const first = await store.save({
      description: 'First',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    await waitForNextMillisecond();
    const second = await store.save({
      description: 'Second',
      photos: [{ sourcePath: '/camera/two.jpg' }],
    });
    const transport = fakeTransport();

    const result = await tick(store, transport, { now: Date.now() });

    expect(result.uploadedIds).toEqual([first.id, second.id]);
    expect(transport.calls).toEqual([
      `photo:${first.photos[0].id}`,
      `complete:${first.id}`,
      `photo:${second.photos[0].id}`,
      `complete:${second.id}`,
    ]);
  });

  it('does not send a photo that already has a server url', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Handrail',
      photos: [
        { sourcePath: '/camera/one.jpg' },
        { sourcePath: '/camera/two.jpg' },
      ],
    });
    await store.update(saved.id, {
      photos: [
        {
          id: saved.photos[0].id,
          remoteUrl: 'https://cdn.example/already.jpg',
        },
      ],
    });
    const transport = fakeTransport();

    await tick(store, transport, { now: Date.now() });

    expect(transport.calls).toEqual([
      `photo:${saved.photos[1].id}`,
      `complete:${saved.id}`,
    ]);
  });

  it('keeps a finished photo when a later photo fails', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Loose tile',
      photos: [
        { sourcePath: '/camera/one.jpg' },
        { sourcePath: '/camera/two.jpg' },
      ],
    });
    const now = Date.now();
    const transport = fakeTransport(2);

    const result = await tick(store, transport, { now });
    const stored = await store.get(saved.id);

    expect(result.deferredIds).toEqual([saved.id]);
    expect(stored?.status).toBe('saved');
    expect(stored?.attemptCount).toBe(1);
    expect(stored?.lastError).toBe('connection dropped');
    expect(stored?.nextAttemptAt).toBe(now + retryDelayMs);
    expect(stored?.photos[0].remoteUrl).toBe(
      `https://cdn.example/${saved.photos[0].id}.jpg`,
    );
    expect(stored?.photos[1].remoteUrl).toBeNull();

    const again = fakeTransport();
    const tooSoon = await tick(store, again, { now });
    expect(tooSoon.uploadedIds).toEqual([]);
    expect(again.calls).toEqual([]);

    const later = await tick(store, again, { now: now + retryDelayMs });
    const finished = await store.get(saved.id);
    expect(later.uploadedIds).toEqual([saved.id]);
    expect(again.calls).toEqual([
      `photo:${saved.photos[1].id}`,
      `complete:${saved.id}`,
    ]);
    expect(finished?.status).toBe('uploaded');
  });

  it('puts a killed upload back to saved while offline', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Killed offline',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    await store.update(saved.id, { status: 'uploading' });
    const transport = fakeTransport();

    const result = await tick(store, transport, {
      online: false,
      now: Date.now(),
    });

    expect(result.uploadedIds).toEqual([]);
    expect(transport.calls).toEqual([]);
    expect((await store.get(saved.id))?.status).toBe('saved');
  });

  it('does nothing while offline', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Offline',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    const transport = fakeTransport();

    const result = await tick(store, transport, { online: false });

    expect(result.uploadedIds).toEqual([]);
    expect(transport.calls).toEqual([]);
    expect((await store.get(saved.id))?.status).toBe('saved');
  });

  it('continues a report left uploading when the app was killed', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Killed mid send',
      photos: [
        { sourcePath: '/camera/one.jpg' },
        { sourcePath: '/camera/two.jpg' },
      ],
    });
    await store.update(saved.id, {
      status: 'uploading',
      photos: [
        {
          id: saved.photos[0].id,
          remoteUrl: 'https://cdn.example/already.jpg',
        },
      ],
    });
    const transport = fakeTransport();

    const result = await tick(store, transport, { now: Date.now() });
    const stored = await store.get(saved.id);

    expect(result.uploadedIds).toEqual([saved.id]);
    expect(transport.calls).toEqual([
      `photo:${saved.photos[1].id}`,
      `complete:${saved.id}`,
    ]);
    expect(stored?.status).toBe('uploaded');
    expect(stored?.photos[0].remoteUrl).toBe('https://cdn.example/already.jpg');
  });

  it('stops waiting when an upload never moves', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Hung',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    const now = Date.now();
    const transport: Transport = {
      uploadPhoto() {
        return new Promise(() => undefined);
      },
      async completeReport() {
        throw new Error('should not finish');
      },
    };

    const result = await tick(store, transport, { now, stallMs: 30 });
    const stored = await store.get(saved.id);

    expect(result.deferredIds).toEqual([saved.id]);
    expect(stored?.status).toBe('saved');
    expect(stored?.lastError).toBe('The upload stalled');
    expect(stored?.nextAttemptAt).toBe(now + retryDelayMs);
    expect(stored?.photos[0].remoteUrl).toBeNull();
  });

  it('keeps a slow upload that is still moving', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Slow',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    const transport: Transport = {
      async uploadPhoto(input) {
        input.onProgress();
        await new Promise<void>(resolve => {
          setTimeout(resolve, 40);
        });
        input.onProgress();
        return { url: `https://cdn.example/${input.imageClientId}.jpg` };
      },
      async completeReport(input) {
        return { id: `server-${input.reportClientId}` };
      },
    };

    const result = await tick(store, transport, { stallMs: 200 });

    expect(result.uploadedIds).toEqual([saved.id]);
    expect((await store.get(saved.id))?.status).toBe('uploaded');
  });

  it('does not retry a report the server rejected', async () => {
    const store = createDisk();
    const saved = await store.save({
      description: 'Rejected',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    const now = Date.now();
    const transport: Transport = {
      async uploadPhoto() {
        throw new UploadError('The server rejected this request', false);
      },
      async completeReport() {
        throw new Error('should not finish');
      },
    };

    const result = await tick(store, transport, { now });
    const stored = await store.get(saved.id);
    const later = await tick(store, fakeTransport(), {
      now: now + retryDelayMs,
    });

    expect(result.heldIds).toEqual([saved.id]);
    expect(stored?.status).toBe('held');
    expect(stored?.lastError).toBe('The server rejected this request');
    expect(later.uploadedIds).toEqual([]);
    expect(later.deferredIds).toEqual([]);
  });

  it('does not send a report that is already uploaded', async () => {
    const store = createDisk();
    await store.save({
      description: 'Done',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    const transport = fakeTransport();

    await tick(store, transport, { now: Date.now() });
    transport.calls.length = 0;
    const second = await tick(store, transport, { now: Date.now() });

    expect(second.uploadedIds).toEqual([]);
    expect(transport.calls).toEqual([]);
  });
});
