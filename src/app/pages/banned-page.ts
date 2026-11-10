import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayout } from '../components/layout/auth-layout';
import { Button } from '../components/ui/button';
import { Icon } from '../components/ui/icon';

@Component({
  selector: 'app-banned-page',
  imports: [AuthLayout, Button, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout title="Your account has been banned">
      <div class="flex flex-col items-start gap-4">
        <span class="flex size-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <app-icon name="ban" size="lg" />
        </span>
        <p class="text-sm text-ink-secondary">
          An administrator has suspended this account, so you've been signed out and can't send or receive messages.
        </p>
        <a appButton variant="secondary" routerLink="/login">Back to login</a>
      </div>
    </app-auth-layout>
  `,
})
export class BannedPage {}
