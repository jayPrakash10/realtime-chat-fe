import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { User } from '../../../api/types';
import { formatDate } from '../../../lib/formatters';
import { Avatar } from '../../ui/avatar';
import { BanToggle } from './ban-toggle';
import { RolePill, StatusPill } from './user-pills';

/** Mobile layout of one admin table row. */
@Component({
  selector: 'app-admin-user-card',
  imports: [Avatar, BanToggle, RolePill, StatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3 rounded-lg border border-border bg-surface p-4' },
  template: `
    @let u = user();
    <div class="flex items-center gap-3">
      <app-avatar [name]="u.name" [src]="u.avatarUrl" size="sm" />
      <div class="min-w-0 flex-1">
        <p class="truncate font-medium text-ink">{{ u.name }}</p>
        <p class="truncate text-xs text-ink-meta">{{ handle() }}</p>
      </div>
      <app-ban-toggle [user]="u" [isSelf]="isSelf()" [busy]="busy()" (toggle)="toggleBan.emit($event)" />
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div class="col-span-2">
        <dt class="text-xs text-ink-meta">Email</dt>
        <dd class="break-all text-ink-secondary">{{ u.email }}</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-meta">Role · Status</dt>
        <dd class="mt-0.5 flex gap-1.5"><app-role-pill [role]="u.role" /><app-status-pill [banned]="u.isBanned" /></dd>
      </div>
      <div>
        <dt class="text-xs text-ink-meta">Joined</dt>
        <dd class="text-ink-secondary"><time [attr.datetime]="u.createdAt">{{ joined() }}</time></dd>
      </div>
    </dl>
  `,
})
export class AdminUserCard {
  readonly user = input.required<User>();
  readonly isSelf = input(false);
  readonly busy = input(false);
  readonly toggleBan = output<User>();

  protected readonly handle = computed(() => '@' + this.user().username);
  protected readonly joined = computed(() => formatDate(this.user().createdAt));
}
