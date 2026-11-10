import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiError } from '../../../api/api-error';
import { UsersApi } from '../../../api/users.api';
import { IMAGE_ACCEPT } from '../../../lib/constants';
import { validateImageFile } from '../../../lib/file-validation';
import { ToastService } from '../../../services/toast.service';
import { AuthStore } from '../../../store/auth.store';
import { Avatar } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { Icon } from '../../ui/icon';

/** PUT /users/me/avatar with client-side type/size checks and upload progress. */
@Component({
  selector: 'app-avatar-uploader',
  imports: [Avatar, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center gap-3 sm:flex-row sm:gap-6' },
  template: `
    @if (auth.me(); as me) {
      <app-avatar [name]="me.name" [src]="me.avatarUrl" size="xl" [alt]="'Your profile photo'" />
    }
    <div class="flex flex-col items-center gap-2 sm:items-start">
      <input #file type="file" class="hidden" tabindex="-1" aria-hidden="true" [accept]="accept" (change)="onFileChange($event)" />
      <button appButton variant="secondary" type="button" [loading]="uploading()" (click)="file.click()">
        @if (!uploading()) {
          <app-icon name="camera" size="sm" />
        }
        {{ uploading() ? 'Uploading… ' + progress() + '%' : 'Change photo' }}
      </button>
      <p class="text-xs text-ink-meta">JPG, PNG or WEBP, up to 5 MB.</p>
      @if (uploading()) {
        <div
          class="h-1.5 w-48 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin="0"
          aria-valuemax="100"
          [attr.aria-valuenow]="progress()"
        >
          <div class="h-full bg-brand-600 transition-[width]" [style.width.%]="progress()"></div>
        </div>
      }
    </div>
  `,
})
export class AvatarUploader {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(UsersApi);
  private readonly toast = inject(ToastService);

  protected readonly accept = IMAGE_ACCEPT;
  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);

  protected async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      this.toast.error(error);
      return;
    }
    this.uploading.set(true);
    this.progress.set(0);
    try {
      const user = await this.api.uploadAvatar(file, { onProgress: (percent) => this.progress.set(percent) });
      this.auth.setMe(user);
      this.toast.success('Profile photo updated.');
    } catch (uploadError) {
      this.toast.error(ApiError.from(uploadError).message);
    } finally {
      this.uploading.set(false);
    }
  }
}
