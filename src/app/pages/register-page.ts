import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RegisterForm } from '../components/features/auth/register-form';
import { AuthLayout } from '../components/layout/auth-layout';

@Component({
  selector: 'app-register-page',
  imports: [AuthLayout, RegisterForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout title="Create your account" subtitle="It takes less than a minute.">
      <app-register-form />
    </app-auth-layout>
  `,
})
export class RegisterPage {}
