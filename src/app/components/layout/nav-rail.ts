import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Icon } from '../ui/icon';
import { Logo } from '../ui/logo';
import { injectNavItems } from './nav-items';

/** Desktop icon rail (md and up). */
@Component({
  selector: 'app-nav-rail',
  imports: [RouterLink, RouterLinkActive, Icon, Badge, Avatar, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'w-16 shrink-0 flex-col items-center justify-between border-r border-border bg-surface-muted py-3' },
  template: `
    <nav aria-label="Main" class="flex flex-col items-center gap-1">
      <a routerLink="/chats" class="mb-4 rounded-lg" aria-label="ChatNest home">
        <app-logo [showName]="false" />
      </a>
      @for (item of items(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="bg-brand-100 text-brand-800"
          ariaCurrentWhenActive="page"
          class="relative flex size-11 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-border/60 hover:text-ink"
          [attr.aria-label]="item.ariaLabel"
          [title]="item.label"
        >
          <app-icon [name]="item.icon" />
          @if (item.badge > 0) {
            <app-badge class="absolute -top-0.5 -right-1" [count]="item.badge" label="" aria-hidden="true" />
          }
        </a>
      }
    </nav>
    @if (auth.me(); as me) {
      <a routerLink="/settings/profile" class="rounded-full" aria-label="My profile" title="My profile">
        <app-avatar [name]="me.name" [src]="me.avatarUrl" size="sm" />
      </a>
    }
  `,
})
export class NavRail {
  protected readonly auth = inject(AuthStore);
  protected readonly items = injectNavItems();
}
