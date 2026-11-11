import { FileReportStore } from './fileReportStore';
import { StoreError } from './types';
import type { FileSystem } from './types';

function createMemoryFileSystem(): FileSystem & {
  files: Map<string, string>;
} {
  const files = new Map<string, string>();

  return {
    files,
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
}

function setup() {
  const disk = createMemoryFileSystem();
  disk.files.set('/camera/one.jpg', 'photo-one');
  disk.files.set('/camera/two.jpg', 'photo-two');
  const store = new FileReportStore(disk, '/phone');
  return { disk, store };
}

describe('file report store', () => {
  it('saves a report and copies its photos', async () => {
    const { disk, store } = setup();
    const photoId = '6f1b0c3e-3c1a-4e5a-9c1e-2b4d6f8a0c11';

    const saved = await store.save({
      description: '  Crack in the stair  ',
      photos: [{ id: photoId, sourcePath: '/camera/one.jpg' }],
    });

    expect(saved.description).toBe('Crack in the stair');
    expect(saved.status).toBe('saved');
    expect(saved.photos).toEqual([
      {
        id: photoId,
        position: 0,
        localPath: `/phone/reports/${saved.id}/${photoId}.jpg`,
        bytes: 'photo-one'.length,
        remoteUrl: null,
      },
    ]);
    expect(disk.files.has('/phone/queue.json.tmp')).toBe(false);
    expect(disk.files.get(`/phone/reports/${saved.id}/${photoId}.jpg`)).toBe(
      'photo-one',
    );

    const listed = await store.list();
    expect(listed).toEqual([saved]);
    expect(await store.get(saved.id)).toEqual(saved);
    expect(await store.get('missing')).toBeNull();
  });

  it('keeps the first report when a second one is saved', async () => {
    const { store } = setup();
    const first = await store.save({
      description: 'First',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });
    const second = await store.save({
      description: 'Second',
      photos: [{ sourcePath: '/camera/two.jpg' }],
    });

    const listed = await store.list();
    expect(listed.map(report => report.id)).toEqual([first.id, second.id]);
  });

  it('records a photo url on the saved report', async () => {
    const { store } = setup();
    const saved = await store.save({
      description: 'Handrail',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });

    const updated = await store.update(saved.id, {
      status: 'uploading',
      photos: [
        {
          id: saved.photos[0].id,
          remoteUrl: 'https://res.cloudinary.com/demo/photo.jpg',
        },
      ],
    });

    expect(updated.status).toBe('uploading');
    expect(updated.photos[0].remoteUrl).toBe(
      'https://res.cloudinary.com/demo/photo.jpg',
    );
    expect((await store.get(saved.id))?.photos[0].remoteUrl).toBe(
      'https://res.cloudinary.com/demo/photo.jpg',
    );
  });

  it('rejects an empty description before writing', async () => {
    const { disk, store } = setup();

    await expect(
      store.save({
        description: '   ',
        photos: [{ sourcePath: '/camera/one.jpg' }],
      }),
    ).rejects.toBeInstanceOf(StoreError);
    expect(disk.files.has('/phone/queue.json')).toBe(false);
  });

  it('rejects zero photos and a sixth photo', async () => {
    const { store } = setup();
    const photos = Array.from({ length: 6 }, () => ({
      sourcePath: '/camera/one.jpg',
    }));

    await expect(
      store.save({ description: 'Note', photos: [] }),
    ).rejects.toThrow('A report needs 1 to 5 photos');
    await expect(store.save({ description: 'Note', photos })).rejects.toThrow(
      'A report can hold 5 photos',
    );
  });

  it('clears the saved list and the copied photos', async () => {
    const { disk, store } = setup();
    const saved = await store.save({
      description: 'Handrail',
      photos: [{ sourcePath: '/camera/one.jpg' }],
    });

    await store.clear();

    expect(await store.list()).toEqual([]);
    expect(disk.files.has('/phone/queue.json')).toBe(false);
    expect(disk.files.has(saved.photos[0].localPath)).toBe(false);
  });

  it('rejects a description longer than 500 characters', async () => {
    const { store } = setup();

    await expect(
      store.save({
        description: 'a'.repeat(501),
        photos: [{ sourcePath: '/camera/one.jpg' }],
      }),
    ).rejects.toThrow('Description is too long');
  });
});
