import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ConfirmService } from '../../../services/confirm.service';
import { AuthStore } from '../../../store/auth.store';
import { BlocksStore } from '../../../store/blocks.store';
import { PaneHeader } from '../../layout/pane-header';
import { Avatar } from '../../ui/avatar';
import { Icon, type IconName } from '../../ui/icon';

interface SettingsLink {
  path: string;
  label: string;
  icon: IconName;
  detail: string | null;
}

@Component({
  selector: 'app-settings-menu-pane',
  imports: [RouterLink, RouterLinkActive, PaneHeader, Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <app-pane-header title="Settings" />
    <div class="min-h-0 flex-1 overflow-y-auto">
      @if (auth.me(); as me) {
        <a routerLink="/settings/profile" class="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-muted">
          <app-avatar [name]="me.name" [src]="me.avatarUrl" size="lg" />
          <span class="min-w-0">
            <span class="block truncate text-lg font-semibold text-ink">{{ me.name }}</span>
            <span class="block truncate text-sm text-ink-secondary">{{ handle() }}</span>
          </span>
        </a>
      }
      <nav aria-label="Settings" class="border-t border-border py-2">
        <ul>
          @for (link of links(); track link.path) {
            <li>
              <a
                [routerLink]="link.path"
                routerLinkActive="bg-brand-50"
                ariaCurrentWhenActive="page"
                class="flex items-center gap-4 px-4 py-3.5 text-ink transition-colors hover:bg-surface-muted"
              >
                <app-icon [name]="link.icon" class="text-ink-secondary" />
                <span class="flex-1 text-base">{{ link.label }}</span>
                @if (link.detail) {
                  <span class="text-sm text-ink-meta">{{ link.detail }}</span>
                }
                <app-icon name="chevron-right" size="sm" class="text-ink-meta" />
              </a>
            </li>
          }
        </ul>
      </nav>
    </div>
    <div class="border-t border-border p-2">
      <button
        type="button"
        class="flex w-full items-center gap-4 rounded-sm px-2 py-3 text-base text-danger-600 transition-colors hover:bg-danger-50"
        (click)="logout()"
      >
        <app-icon name="logout" />
        Log out
      </button>
    </div>
  `,
})
export class SettingsMenuPane {
  protected readonly auth = inject(AuthStore);
  private readonly blocks = inject(BlocksStore);
  private readonly confirm = inject(ConfirmService);

  protected readonly handle = computed(() => '@' + (this.auth.me()?.username ?? ''));
  protected readonly links = computed<SettingsLink[]>(() => {
    const blockedCount = this.blocks.status() === 'ready' ? this.blocks.entries().length : null;
    const links: SettingsLink[] = [
      { path: '/settings/profile', label: 'Profile', icon: 'user', detail: null },
      {
        path: '/settings/blocked',
        label: 'Blocked users',
        icon: 'ban',
        detail: blockedCount ? String(blockedCount) : null,
      },
    ];
    if (this.auth.isAdmin()) links.push({ path: '/admin/users', label: 'Admin: users', icon: 'shield', detail: null });
    return links;
  });

  constructor() {
    void this.blocks.ensureLoaded();
  }

  protected async logout(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Log out?',
      message: 'You will need your email and password to log in again.',
      confirmLabel: 'Log out',
      tone: 'danger',
    });
    if (confirmed) this.auth.logout('manual');
  }
}
