import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../api/api-error';
import { LIMITS, USERNAME_PATTERN } from '../../../lib/constants';
import { applyServerErrors, controlError, describedBy, trimmedLength } from '../../../lib/form-errors';
import { AuthStore } from '../../../store/auth.store';
import { Button } from '../../ui/button';
import { FormField } from '../../ui/form-field';
import { Icon } from '../../ui/icon';
import { PasswordInput } from './password-input';

const USERNAME_HINT = '3–30 characters: letters, numbers, _ and . (saved in lowercase)';

@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule, RouterLink, Button, FormField, Icon, PasswordInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" class="flex flex-col gap-4" novalidate (ngSubmit)="submit()">
      @if (formError()) {
        <p class="flex items-start gap-2 rounded-sm bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          <app-icon name="alert" size="sm" class="mt-0.5" />{{ formError() }}
        </p>
      }

      <app-form-field label="Name" fieldId="register-name" [error]="errors().name">
        <input
          id="register-name"
          class="input"
          formControlName="name"
          autocomplete="name"
          [attr.aria-invalid]="errors().name ? 'true' : null"
          [attr.aria-describedby]="describedBy('register-name', errors().name)"
        />
      </app-form-field>

      <app-form-field label="Username" fieldId="register-username" [error]="errors().username" [hint]="usernameHint">
        <input
          id="register-username"
          class="input"
          formControlName="username"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          [attr.aria-invalid]="errors().username ? 'true' : null"
          [attr.aria-describedby]="describedBy('register-username', errors().username, true)"
        />
      </app-form-field>

      <app-form-field label="Email" fieldId="register-email" [error]="errors().email">
        <input
          id="register-email"
          class="input"
          type="email"
          formControlName="email"
          autocomplete="email"
          inputmode="email"
          [attr.aria-invalid]="errors().email ? 'true' : null"
          [attr.aria-describedby]="describedBy('register-email', errors().email)"
        />
      </app-form-field>

      <app-form-field label="Password" fieldId="register-password" [error]="errors().password" hint="8–72 characters">
        <app-password-input
          inputId="register-password"
          autocomplete="new-password"
          [control]="form.controls.password"
          [invalid]="!!errors().password"
          [describedBy]="describedBy('register-password', errors().password, true)"
        />
      </app-form-field>

      <button appButton type="submit" class="mt-2 w-full" [loading]="submitting()">Create account</button>

      <p class="text-center text-sm text-ink-secondary">
        Already have an account?
        <a routerLink="/login" class="font-medium text-brand-700 hover:underline">Log in</a>
      </p>
    </form>
  `,
})
export class RegisterForm {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly describedBy = describedBy;
  protected readonly usernameHint = USERNAME_HINT;
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [trimmedLength(1, LIMITS.nameMax)]],
    username: [
      '',
      [trimmedLength(LIMITS.usernameMin, LIMITS.usernameMax), Validators.pattern(USERNAME_PATTERN)],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(LIMITS.passwordMin), Validators.maxLength(LIMITS.passwordMax)],
    ],
  });

  private readonly formState = toSignal(this.form.events, { initialValue: null });
  protected readonly errors = computed(() => {
    this.formState();
    const c = this.form.controls;
    return {
      name: controlError(c.name, 'Name'),
      username: controlError(c.username, 'Username', 'Use only letters, numbers, underscores and dots'),
      email: controlError(c.email, 'Email'),
      password: controlError(c.password, 'Password'),
    };
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.formError.set(null);
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    try {
      const { name, username, email, password } = this.form.getRawValue();
      await this.auth.register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      await this.router.navigateByUrl('/chats');
    } catch (error) {
      this.formError.set(this.handleError(ApiError.from(error)));
    } finally {
      this.submitting.set(false);
    }
  }

  /** 409s ("That email/username is already registered") have no details, so map them to the field by hand. */
  private handleError(error: ApiError): string | null {
    if (error.status === 409) {
      const field = /email/i.test(error.message) ? 'email' : /username/i.test(error.message) ? 'username' : null;
      if (field) {
        const control = this.form.controls[field];
        control.setErrors({ server: error.message });
        control.markAsTouched();
        return null;
      }
    }
    return applyServerErrors(this.form, error);
  }
}
