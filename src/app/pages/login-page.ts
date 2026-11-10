import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core';
import { environment } from '../../environments/environment';
import { DemoAccounts } from '../components/features/auth/demo-accounts';
import { LoginForm } from '../components/features/auth/login-form';
import { AuthLayout } from '../components/layout/auth-layout';

@Component({
  selector: 'app-login-page',
  imports: [AuthLayout, LoginForm, DemoAccounts],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout title="Welcome back" subtitle="Log in to continue your conversations.">
      <app-login-form [returnUrl]="returnUrl() ?? null" />
      @if (showDemo) {
        <app-demo-accounts authFooter (pick)="loginForm().fillDemo($event)" />
      }
    </app-auth-layout>
  `,
})
export class LoginPage {
  /** Bound from the ?returnUrl= query parameter. */
  readonly returnUrl = input<string>();
  protected readonly showDemo = environment.useMocks;
  protected readonly loginForm = viewChild.required(LoginForm);
}
