import type { StoredReport } from '../store/types';

export function phoneStatus(
  report: StoredReport,
  online: boolean,
  now: number,
) {
  if (report.status === 'held') {
    return "Couldn't send. Still on this phone.";
  }

  if (report.status === 'uploaded') {
    return 'Sent from this phone.';
  }

  if (report.status === 'uploading') {
    const sent = report.photos.filter(photo => photo.remoteUrl).length;
    const current = Math.min(sent + 1, report.photos.length);
    return `Sending photo ${current} of ${report.photos.length}.`;
  }

  if (!online) {
    return 'Waiting for a connection.';
  }

  if (report.lastError || report.nextAttemptAt > now) {
    console.log('----------REPORT-------------',report);
    
    return 'Will keep trying.';
  }

  return 'Saved on this phone.';
}
