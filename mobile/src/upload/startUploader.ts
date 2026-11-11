import { AppState } from 'react-native';
import { tick, retryDelayMs } from './engine';
import type { ReportStore, Transport } from '../types/types';

let uploadsPaused = false;
let uploadsRunning = false;
const idleWaiters: Array<() => void> = [];

export function setUploadsPaused(paused: boolean) {
  uploadsPaused = paused;
}

export function whenUploadsIdle() {
  if (!uploadsRunning) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    idleWaiters.push(resolve);
  });
}

export function startUploader(
  store: ReportStore,
  transport: Transport,
  getOnline: () => boolean,
) {
  let stopped = false;

  const run = () => {
    if (stopped || uploadsRunning || uploadsPaused) {
      return;
    }

    uploadsRunning = true;
    tick(store, transport, { online: getOnline() })
      .catch(() => undefined)
      .finally(() => {
        uploadsRunning = false;
        const waiting = idleWaiters.splice(0);
        waiting.forEach(resolve => resolve());
      });
  };

  const timer = setInterval(run, retryDelayMs);
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      run();
    }
  });
  run();

  return {
    run,
    stop() {
      stopped = true;
      clearInterval(timer);
      subscription.remove();
    },
  };
}
