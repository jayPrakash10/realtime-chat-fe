import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Badge } from '../ui/badge';
import { Icon } from '../ui/icon';
import { injectNavItems } from './nav-items';

/** Mobile tab bar, shown under list-level screens only. */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, Icon, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Main" class="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul class="flex">
        @for (item of items(); track item.path) {
          <li class="flex-1">
            <a
              [routerLink]="item.path"
              routerLinkActive="text-brand-700"
              ariaCurrentWhenActive="page"
              class="flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-ink-secondary"
              [attr.aria-label]="item.ariaLabel"
            >
              <span class="relative">
                <app-icon [name]="item.icon" />
                @if (item.badge > 0) {
                  <app-badge class="absolute -top-2 -right-3" [count]="item.badge" label="" aria-hidden="true" />
                }
              </span>
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class BottomNav {
  protected readonly items = injectNavItems();
}
