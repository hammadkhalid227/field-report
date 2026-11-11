export type ReportStatus = 'saved' | 'uploading' | 'uploaded' | 'held';

export type StoredPhoto = {
  id: string;
  position: number;
  localPath: string;
  bytes: number;
  remoteUrl: string | null;
};

export type StoredReport = {
  id: string;
  description: string;
  status: ReportStatus;
  createdAt: number;
  nextAttemptAt: number;
  attemptCount: number;
  lastError: string | null;
  serverId: string | null;
  photos: StoredPhoto[];
};

export type NewPhoto = {
  id?: string;
  sourcePath: string;
};

export type NewReport = {
  id?: string;
  description: string;
  photos: NewPhoto[];
};

export type PhotoUpdate = {
  id: string;
  remoteUrl: string | null;
};

export type ReportUpdate = {
  status?: ReportStatus;
  nextAttemptAt?: number;
  attemptCount?: number;
  lastError?: string | null;
  serverId?: string | null;
  photos?: PhotoUpdate[];
};

export type FileSystem = {
  readText(path: string): Promise<string | null>;
  writeText(path: string, text: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  size(path: string): Promise<number>;
};

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
  }
}

export type ReportStore = {
  save(input: NewReport): Promise<StoredReport>;
  list(): Promise<StoredReport[]>;
  get(id: string): Promise<StoredReport | null>;
  update(id: string, patch: ReportUpdate): Promise<StoredReport>;
  clear(): Promise<void>;
};
