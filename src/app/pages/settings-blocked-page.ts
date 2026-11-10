import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BlockedList } from '../components/features/settings/blocked-list';
import { PageHeader } from '../components/layout/page-header';

@Component({
  selector: 'app-settings-blocked-page',
  imports: [PageHeader, BlockedList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <app-page-header title="Blocked users" backLink="/settings" backLabel="Back to settings" />
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-content px-4 py-6 md:px-8">
        <app-blocked-list />
      </div>
    </div>
  `,
})
export class SettingsBlockedPage {}
