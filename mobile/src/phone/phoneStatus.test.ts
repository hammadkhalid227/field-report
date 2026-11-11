import { phoneStatus } from './phoneStatus';
import type { StoredReport } from '../store/types';

function report(patch: Partial<StoredReport> = {}): StoredReport {
  return {
    id: 'report-1',
    description: 'Crack',
    status: 'saved',
    createdAt: 1_000,
    nextAttemptAt: 1_000,
    attemptCount: 0,
    lastError: null,
    serverId: null,
    photos: [
      {
        id: 'photo-1',
        position: 0,
        localPath: '/phone/a.jpg',
        bytes: 10,
        remoteUrl: null,
      },
      {
        id: 'photo-2',
        position: 1,
        localPath: '/phone/b.jpg',
        bytes: 10,
        remoteUrl: null,
      },
    ],
    ...patch,
  };
}

describe('phoneStatus', () => {
  const now = 5_000;

  it('says the report is only on the phone', () => {
    expect(phoneStatus(report(), true, now)).toBe('Saved on this phone.');
  });

  it('says the phone is waiting for a connection', () => {
    expect(phoneStatus(report(), false, now)).toBe('Waiting for a connection.');
  });

  it('says which photo is sending', () => {
    const sending = report({
      status: 'uploading',
      photos: [
        { ...report().photos[0], remoteUrl: 'https://cdn.example/a.jpg' },
        report().photos[1],
      ],
    });

    expect(phoneStatus(sending, true, now)).toBe('Sending photo 2 of 2.');
  });

  it('says it will keep trying after a drop', () => {
    expect(
      phoneStatus(report({ lastError: 'connection dropped' }), true, now),
    ).toBe('Will keep trying.');
  });

  it('says a rejected report is still on the phone', () => {
    expect(phoneStatus(report({ status: 'held' }), true, now)).toBe(
      "Couldn't send. Still on this phone.",
    );
  });
});
