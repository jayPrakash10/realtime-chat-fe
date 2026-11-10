import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Registers the MSW service worker (public/mockServiceWorker.js). Requests MSW doesn't handle pass through. */
export async function startMockWorker(): Promise<void> {
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true });
  console.info('[ChatNest] Mock mode: API and socket are simulated in the browser. Password for every demo account: Password123!');
}
