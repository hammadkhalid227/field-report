import { AppState } from 'react-native';
import { tick, retryDelayMs } from './engine';
import type { Transport } from './engine';
import type { ReportStore } from '../store/types';

export function startUploader(
  store: ReportStore,
  transport: Transport,
  getOnline: () => boolean,
) {
  let stopped = false;
  let running = false;

  const run = () => {
    if (stopped || running) {
      return;
    }

    running = true;
    tick(store, transport, { online: getOnline() })
      .catch(() => undefined)
      .finally(() => {
        running = false;
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
