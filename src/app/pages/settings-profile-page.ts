import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AvatarUploader } from '../components/features/settings/avatar-uploader';
import { ProfileForm } from '../components/features/settings/profile-form';
import { PageHeader } from '../components/layout/page-header';

@Component({
  selector: 'app-settings-profile-page',
  imports: [PageHeader, AvatarUploader, ProfileForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <app-page-header title="Profile" backLink="/settings" backLabel="Back to settings" />
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-6 md:px-8">
        <app-avatar-uploader />
        <app-profile-form />
      </div>
    </div>
  `,
})
export class SettingsProfilePage {}
