import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointService } from '../services/breakpoint.service';

/**
 * /settings. On mobile the settings menu (left pane) is the whole screen and this page is hidden.
 * On desktop there is room for a detail page, so it opens Profile.
 */
@Component({
  selector: 'app-settings-index-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class SettingsIndexPage {
  constructor() {
    const breakpoints = inject(BreakpointService);
    const router = inject(Router);
    effect(() => {
      if (breakpoints.isDesktop()) void router.navigateByUrl('/settings/profile', { replaceUrl: true });
    });
  }
}
