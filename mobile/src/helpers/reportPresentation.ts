import type { StoredReport } from '../store/types';

export function phoneCardTone(
  report: StoredReport,
  online: boolean,
  now: number,
) {
  if (report.status === 'held') {
    return 'danger' as const;
  }
  if (report.status === 'uploaded') {
    return 'ok' as const;
  }
  if (report.status === 'uploading') {
    return 'progress' as const;
  }
  if (!online || report.lastError || report.nextAttemptAt > now) {
    return 'warn' as const;
  }
  return 'neutral' as const;
}

export function phoneCardProgress(
  report: StoredReport,
  online: boolean,
  now: number,
) {
  if (report.status === 'held' || report.status === 'uploaded') {
    return undefined;
  }

  if (report.status === 'uploading') {
    const total = report.photos.length;
    if (total === 0) {
      return null;
    }
    const sent = report.photos.filter(photo => photo.remoteUrl).length;
    if (sent === 0) {
      return null;
    }
    return sent / total;
  }

  if (!online || report.lastError || report.nextAttemptAt > now) {
    return null;
  }

  return undefined;
}
