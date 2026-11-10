import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiError } from '../../../api/api-error';
import type { UpdateProfileBody } from '../../../api/types';
import { UsersApi } from '../../../api/users.api';
import { LIMITS } from '../../../lib/constants';
import { applyServerErrors, controlError, describedBy, trimmedLength } from '../../../lib/form-errors';
import { ToastService } from '../../../services/toast.service';
import { AuthStore } from '../../../store/auth.store';
import { Button } from '../../ui/button';
import { FormField } from '../../ui/form-field';
import { Icon } from '../../ui/icon';

/** PATCH /users/me: name and bio. Username and email are shown read-only (the API can't change them). */
@Component({
  selector: 'app-profile-form',
  imports: [ReactiveFormsModule, Button, FormField, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" class="flex flex-col gap-5" novalidate (ngSubmit)="submit()">
      @if (formError()) {
        <p class="flex items-start gap-2 rounded-sm bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          <app-icon name="alert" size="sm" class="mt-0.5" />{{ formError() }}
        </p>
      }

      <app-form-field label="Name" fieldId="profile-name" [error]="nameError()" [counter]="{ current: lengths().name, max: limits.nameMax }">
        <input
          id="profile-name"
          class="input"
          formControlName="name"
          autocomplete="name"
          [attr.aria-invalid]="nameError() ? 'true' : null"
          [attr.aria-describedby]="describedBy('profile-name', nameError())"
        />
      </app-form-field>

      <app-form-field
        label="Bio"
        fieldId="profile-bio"
        [error]="bioError()"
        hint="Optional. Leave empty to clear your bio."
        [counter]="{ current: lengths().bio, max: limits.bioMax }"
      >
        <textarea
          id="profile-bio"
          class="input"
          rows="3"
          formControlName="bio"
          [attr.aria-invalid]="bioError() ? 'true' : null"
          [attr.aria-describedby]="describedBy('profile-bio', bioError(), true)"
        ></textarea>
      </app-form-field>

      @if (auth.me(); as me) {
        <dl class="grid gap-4 rounded-lg bg-surface-muted p-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-semibold tracking-wide text-ink-meta uppercase">Username</dt>
            <dd class="mt-1 text-sm text-ink">{{ handle() }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold tracking-wide text-ink-meta uppercase">Email</dt>
            <dd class="mt-1 text-sm break-all text-ink">{{ me.email }}</dd>
          </div>
        </dl>
      }

      <div class="flex justify-end gap-2">
        <button appButton variant="secondary" type="button" [disabled]="!dirty() || saving()" (click)="reset()">Cancel</button>
        <button appButton type="submit" [loading]="saving()" [disabled]="!dirty()">Save changes</button>
      </div>
    </form>
  `,
})
export class ProfileForm {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(UsersApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly limits = LIMITS;
  protected readonly describedBy = describedBy;
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: [this.auth.me()?.name ?? '', [trimmedLength(1, LIMITS.nameMax)]],
    bio: [this.auth.me()?.bio ?? '', [trimmedLength(0, LIMITS.bioMax)]],
  });

  /** Re-evaluates error text and counters whenever values or touched state change. */
  private readonly formState = toSignal(this.form.events, { initialValue: null });

  protected readonly lengths = computed(() => {
    this.formState();
    const { name, bio } = this.form.getRawValue();
    return { name: name.trim().length, bio: bio.trim().length };
  });
  protected readonly nameError = computed(() => {
    this.formState();
    return controlError(this.form.controls.name, 'Name');
  });
  protected readonly bioError = computed(() => {
    this.formState();
    return controlError(this.form.controls.bio, 'Bio');
  });
  protected readonly dirty = computed(() => {
    this.formState();
    const me = this.auth.me();
    const { name, bio } = this.form.getRawValue();
    return !!me && (name.trim() !== me.name || bio.trim() !== me.bio);
  });
  protected readonly handle = computed(() => '@' + (this.auth.me()?.username ?? ''));

  protected reset(): void {
    const me = this.auth.me();
    this.form.reset({ name: me?.name ?? '', bio: me?.bio ?? '' });
    this.formError.set(null);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.formError.set(null);
    const me = this.auth.me();
    if (this.form.invalid || !me || this.saving()) return;

    const { name, bio } = this.form.getRawValue();
    const body: UpdateProfileBody = {};
    if (name.trim() !== me.name) body.name = name.trim();
    if (bio.trim() !== me.bio) body.bio = bio.trim();
    if (!Object.keys(body).length) return;

    this.saving.set(true);
    try {
      const user = await this.api.updateMe(body);
      this.auth.setMe(user);
      this.form.reset({ name: user.name, bio: user.bio });
      this.toast.success('Profile saved.');
    } catch (error) {
      this.formError.set(applyServerErrors(this.form, ApiError.from(error)));
    } finally {
      this.saving.set(false);
    }
  }
}
