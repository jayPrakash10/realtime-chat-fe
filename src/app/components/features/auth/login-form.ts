import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../api/api-error';
import { DEMO_PASSWORD } from '../../../lib/constants';
import { applyServerErrors, controlError, describedBy } from '../../../lib/form-errors';
import { AuthStore } from '../../../store/auth.store';
import { Button } from '../../ui/button';
import { FormField } from '../../ui/form-field';
import { Icon } from '../../ui/icon';
import { PasswordInput } from './password-input';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, RouterLink, Button, FormField, Icon, PasswordInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" class="flex flex-col gap-4" novalidate (ngSubmit)="submit()">
      @if (formError()) {
        <p class="flex items-start gap-2 rounded-sm bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
          <app-icon name="alert" size="sm" class="mt-0.5" />{{ formError() }}
        </p>
      }

      <app-form-field label="Email" fieldId="login-email" [error]="emailError()">
        <input
          id="login-email"
          class="input"
          type="email"
          formControlName="email"
          autocomplete="email"
          inputmode="email"
          [attr.aria-invalid]="emailError() ? 'true' : null"
          [attr.aria-describedby]="describedBy('login-email', emailError())"
        />
      </app-form-field>

      <app-form-field label="Password" fieldId="login-password" [error]="passwordError()">
        <app-password-input
          inputId="login-password"
          [control]="form.controls.password"
          [invalid]="!!passwordError()"
          [describedBy]="describedBy('login-password', passwordError())"
        />
      </app-form-field>

      <button appButton type="submit" class="mt-2 w-full" [loading]="submitting()">Log in</button>

      <p class="text-center text-sm text-ink-secondary">
        New to ChatNest?
        <a routerLink="/register" class="font-medium text-brand-700 hover:underline">Create an account</a>
      </p>
    </form>
  `,
})
export class LoginForm {
  /** Where to go after logging in (from the auth guard). Only in-app paths are accepted. */
  readonly returnUrl = input<string | null>(null);

  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly describedBy = describedBy;
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  private readonly formState = toSignal(this.form.events, { initialValue: null });
  protected readonly emailError = computed(() => {
    this.formState();
    return controlError(this.form.controls.email, 'Email');
  });
  protected readonly passwordError = computed(() => {
    this.formState();
    return controlError(this.form.controls.password, 'Password');
  });

  /** Used by the demo-accounts picker in mock mode. */
  fillDemo(email: string): void {
    this.form.setValue({ email, password: DEMO_PASSWORD });
    this.formError.set(null);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.formError.set(null);
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login({ email: email.trim().toLowerCase(), password });
      const target = this.returnUrl();
      await this.router.navigateByUrl(target?.startsWith('/') && !target.startsWith('//') ? target : '/chats');
    } catch (error) {
      this.formError.set(applyServerErrors(this.form, ApiError.from(error)));
    } finally {
      this.submitting.set(false);
    }
  }
}
