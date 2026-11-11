import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type ServerImage = {
  id: string;
  clientId: string;
  position: number;
  url: string;
  bytes: number;
};

export type ServerReport = {
  id: string;
  clientId: string;
  description: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  images: ServerImage[];
};

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

export type MainTabParamList = {
  Phone: undefined;
  Server: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Compose: undefined;
  PhoneReport: { id: string };
  ServerReport: { id: string };
};

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

export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

export type ManualCompress = (
  uri: string,
  options: {
    compressionMethod: 'manual';
    maxWidth: number;
    maxHeight: number;
    quality: number;
    output: 'jpg';
  },
) => Promise<string>;

export type ReportCardTone = 'neutral' | 'progress' | 'ok' | 'warn' | 'danger';

export type ReportCardProps = {
  title: string;
  createdAt: number | string;
  photoCount: number;
  status: string;
  tone: ReportCardTone;
  progress?: number | null;
  onPress: () => void;
};

export type DraftPhoto = {
  id: string;
  status: 'preparing' | 'ready';
  uri: string;
};

export type AppIconProps = {
  xml: string;
  size?: number;
  color?: string;
};

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Phone'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ComposeScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Compose'
>;

export type PhoneReportScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'PhoneReport'
>;

export type ServerScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Server'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ServerReportScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ServerReport'
>;
