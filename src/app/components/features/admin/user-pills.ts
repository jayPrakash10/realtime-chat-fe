import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Role } from '../../../api/types';

@Component({
  selector: 'app-role-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      [class]="role() === 'admin' ? 'bg-brand-100 text-brand-800' : 'bg-surface-muted text-ink-secondary'"
    >
      {{ role() === 'admin' ? 'Admin' : 'User' }}
    </span>
  `,
})
export class RolePill {
  readonly role = input.required<Role>();
}

@Component({
  selector: 'app-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      [class]="banned() ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'"
    >
      {{ banned() ? 'Banned' : 'Active' }}
    </span>
  `,
})
export class StatusPill {
  readonly banned = input.required<boolean>();
}
