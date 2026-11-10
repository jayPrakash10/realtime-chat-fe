import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

/** In mock mode, start the MSW service worker before the app makes its first request. */
async function startMocksIfEnabled(): Promise<void> {
  if (!environment.useMocks) return;
  const { startMockWorker } = await import('./mocks/browser');
  await startMockWorker();
}

startMocksIfEnabled()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((error: unknown) => console.error(error));
