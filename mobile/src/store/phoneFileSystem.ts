import ReactNativeBlobUtil from 'react-native-blob-util';
import { FileReportStore } from './fileReportStore';
import type { FileSystem } from './types';

const fs = ReactNativeBlobUtil.fs;

function parentDir(filePath: string) {
  const index = filePath.lastIndexOf('/');
  if (index <= 0) {
    return filePath;
  }
  return filePath.slice(0, index);
}

async function ensureDir(dir: string) {
  if (await fs.exists(dir)) {
    return;
  }

  try {
    await fs.mkdir(dir);
  } catch (error) {
    if (await fs.exists(dir)) {
      return;
    }
    throw error;
  }
}

export function createPhoneFileSystem(): FileSystem {
  return {
    async readText(path) {
      if (!(await fs.exists(path))) {
        return null;
      }
      return fs.readFile(path, 'utf8');
    },
    async writeText(path, text) {
      await ensureDir(parentDir(path));
      await fs.writeFile(path, text, 'utf8');
    },
    async move(from, to) {
      await ensureDir(parentDir(to));
      if (await fs.exists(to)) {
        await fs.unlink(to);
      }
      await fs.mv(from, to);
    },
    async copy(from, to) {
      await ensureDir(parentDir(to));
      if (await fs.exists(to)) {
        await fs.unlink(to);
      }
      if (from.includes('://')) {
        await fs.writeFile(to, from, 'uri');
        return;
      }
      await fs.cp(from, to);
    },
    async remove(path) {
      if (await fs.exists(path)) {
        await fs.unlink(path);
      }
    },
    exists(path) {
      return fs.exists(path);
    },
    async mkdir(path) {
      await ensureDir(path);
    },
    async size(path) {
      const info = await fs.stat(path);
      return info.size;
    },
  };
}

export function createPhoneReportStore() {
  return new FileReportStore(
    createPhoneFileSystem(),
    `${fs.dirs.DocumentDir}/field-reports`,
  );
}
