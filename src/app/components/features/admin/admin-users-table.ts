import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { User } from '../../../api/types';
import { formatDate } from '../../../lib/formatters';
import { Avatar } from '../../ui/avatar';
import { BanToggle } from './ban-toggle';
import { RolePill, StatusPill } from './user-pills';

/** Desktop (md+) table of users. */
@Component({
  selector: 'app-admin-users-table',
  imports: [Avatar, BanToggle, RolePill, StatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-x-auto rounded-lg border border-border' },
  template: `
    <table class="w-full text-left text-sm">
      <caption class="sr-only">Users</caption>
      <thead class="bg-surface-muted text-xs font-semibold tracking-wide text-ink-meta uppercase">
        <tr>
          <th scope="col" class="px-4 py-3">User</th>
          <th scope="col" class="px-4 py-3">Email</th>
          <th scope="col" class="px-4 py-3">Role</th>
          <th scope="col" class="px-4 py-3">Status</th>
          <th scope="col" class="px-4 py-3">Joined</th>
          <th scope="col" class="px-4 py-3 text-right"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        @for (user of users(); track user._id) {
          <tr class="hover:bg-surface-muted/60">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <app-avatar [name]="user.name" [src]="user.avatarUrl" size="xs" />
                <div class="min-w-0">
                  <p class="truncate font-medium text-ink">{{ user.name }}</p>
                  <p class="truncate text-xs text-ink-meta">{{ handle(user) }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 break-all text-ink-secondary">{{ user.email }}</td>
            <td class="px-4 py-3"><app-role-pill [role]="user.role" /></td>
            <td class="px-4 py-3"><app-status-pill [banned]="user.isBanned" /></td>
            <td class="px-4 py-3 whitespace-nowrap text-ink-secondary">
              <time [attr.datetime]="user.createdAt">{{ joined(user) }}</time>
            </td>
            <td class="px-4 py-3 text-right">
              <app-ban-toggle
                [user]="user"
                [isSelf]="user._id === meId()"
                [busy]="busyId() === user._id"
                (toggle)="toggleBan.emit($event)"
              />
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminUsersTable {
  readonly users = input.required<readonly User[]>();
  readonly meId = input.required<string | null>();
  readonly busyId = input<string | null>(null);
  readonly toggleBan = output<User>();

  protected handle(user: User): string {
    return '@' + user.username;
  }

  protected joined(user: User): string {
    return formatDate(user.createdAt);
  }
}
