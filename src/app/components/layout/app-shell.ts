import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ChatListPane } from '../features/chats/chat-list-pane';
import { SettingsMenuPane } from '../features/settings/settings-menu-pane';
import { UserSearchPane } from '../features/users/user-search-pane';
import { BottomNav } from './bottom-nav';
import { NavRail } from './nav-rail';

export type ShellPane = 'chats' | 'search' | 'settings' | 'none';

/** Route data read by the shell (set in app.routes.ts). */
export interface ShellRouteData {
  pane: ShellPane;
  /** Detail screens take the full screen on mobile and hide the left pane. */
  detail: boolean;
}

const DEFAULT_DATA: ShellRouteData = { pane: 'chats', detail: false };

/**
 * Authenticated layout: rail, left pane and main pane on desktop; one pane at a time on mobile.
 * The left pane's content and the mobile behaviour come from the active route's data.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, NavRail, BottomNav, ChatListPane, UserSearchPane, SettingsMenuPane],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">ChatNest</h1>
    <div class="flex h-dvh overflow-hidden bg-app-bg">
      <app-nav-rail class="hidden md:flex" />

      @if (data().pane !== 'none') {
        <section class="min-w-0 flex-col border-r border-border bg-surface" [class]="leftPaneClass()" aria-label="Sidebar">
          <div class="min-h-0 flex-1">
            @switch (data().pane) {
              @case ('chats') {
                <app-chat-list-pane />
              }
              @case ('search') {
                <app-user-search-pane />
              }
              @case ('settings') {
                <app-settings-menu-pane />
              }
            }
          </div>
          <app-bottom-nav class="md:hidden" />
        </section>
      }

      <main class="min-w-0 flex-1 flex-col bg-surface" [class]="mainClass()">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShell {
  private readonly router = inject(Router);

  protected readonly data = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readRouteData()),
      startWith(this.readRouteData()),
    ),
    { requireSync: true },
  );

  protected readonly leftPaneClass = computed(() =>
    this.data().detail ? 'hidden md:flex md:w-pane lg:w-pane-lg' : 'flex flex-1 md:w-pane md:flex-none lg:w-pane-lg',
  );

  protected readonly mainClass = computed(() => (this.data().detail ? 'flex' : 'hidden md:flex'));

  private readRouteData(): ShellRouteData {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    return { ...DEFAULT_DATA, ...(route.data as Partial<ShellRouteData>) };
  }
}
