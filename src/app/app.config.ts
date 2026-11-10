import { type ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { RealtimeSyncService } from './services/realtime-sync.service';
import { AuthStore } from './store/auth.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Route params, query params and route data bind straight to component inputs.
    provideRouter(routes, withComponentInputBinding()),
    // Validate a stored token before the first navigation, so guards know who is logged in.
    provideAppInitializer(() => inject(AuthStore).restore()),
    provideAppInitializer(() => inject(RealtimeSyncService).start()),
  ],
};
