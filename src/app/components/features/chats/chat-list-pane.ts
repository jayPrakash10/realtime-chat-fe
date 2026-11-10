import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../store/auth.store';
import { ConversationsStore, type ChatFilter } from '../../../store/conversations.store';
import { PaneHeader } from '../../layout/pane-header';
import { Button } from '../../ui/button';
import { Chip } from '../../ui/chip';
import { EmptyState } from '../../ui/empty-state';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { IconButton } from '../../ui/icon-button';
import { InfiniteScroll } from '../../ui/infinite-scroll';
import { Spinner } from '../../ui/spinner';
import { ChatListItem } from './chat-list-item';
import { ChatListSkeleton } from './chat-list-skeleton';

/** Left pane: chat list with All / Unread filters and infinite scroll (GET /conversations). */
@Component({
  selector: 'app-chat-list-pane',
  imports: [
    RouterLink,
    PaneHeader,
    Button,
    Chip,
    EmptyState,
    ErrorState,
    Icon,
    IconButton,
    InfiniteScroll,
    Spinner,
    ChatListItem,
    ChatListSkeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <app-pane-header title="Chats">
      <a appIconButton routerLink="/search" icon="edit" label="New chat"></a>
    </app-pane-header>

    <div class="flex flex-col gap-2 border-b border-border px-3 py-2">
      <a
        routerLink="/search"
        class="flex h-9 items-center gap-2 rounded-sm bg-surface-muted px-3 text-sm text-ink-meta transition-colors hover:bg-border"
      >
        <app-icon name="search" size="sm" />
        Search people
      </a>
      <div class="flex gap-2" role="group" aria-label="Filter chats">
        <button appChip [selected]="store.filter() === 'all'" (click)="setFilter('all')">All</button>
        <button appChip [selected]="store.filter() === 'unread'" (click)="setFilter('unread')">
          Unread
          @if (store.unreadChats() > 0) {
            <span class="text-xs">{{ store.unreadChats() }}</span>
          }
        </button>
      </div>
    </div>

    <div #scroller class="min-h-0 flex-1 overflow-y-auto">
      @if (store.loading() && !store.items().length) {
        <app-chat-list-skeleton />
      } @else if (store.error() && !store.items().length) {
        <app-error-state title="Couldn't load your chats" [message]="store.error()!" (retry)="store.load()" />
      } @else if (!store.items().length) {
        @if (store.filter() === 'unread') {
          <app-empty-state icon="check-double" title="You're all caught up" description="No chats with unread messages." />
        } @else {
          <app-empty-state icon="chat" title="No chats yet" description="Find someone and say hi.">
            <a appButton routerLink="/search">Start a new chat</a>
          </app-empty-state>
        }
      } @else {
        <ul class="divide-y divide-border/70" aria-label="Chats">
          @for (conversation of store.items(); track conversation._id) {
            <li>
              <app-chat-list-item
                [conversation]="conversation"
                [meId]="meId()"
                [active]="conversation._id === store.activeId()"
              />
            </li>
          }
        </ul>
        @if (store.hasMore()) {
          <div
            appInfiniteScroll
            [appInfiniteScrollRoot]="scroller"
            [appInfiniteScrollDisabled]="store.loadingMore() || !!store.error()"
            (reached)="store.loadMore()"
            class="flex justify-center py-4"
          >
            @if (store.error()) {
              <button appButton variant="ghost" size="sm" type="button" (click)="store.loadMore()">
                Couldn't load more. Retry
              </button>
            } @else {
              <app-spinner label="Loading more chats" />
            }
          </div>
        }
      }
    </div>
  `,
})
export class ChatListPane {
  protected readonly store = inject(ConversationsStore);
  private readonly auth = inject(AuthStore);

  protected readonly meId = computed(() => this.auth.me()?._id ?? null);

  constructor() {
    if (!this.store.loaded() && !this.store.loading()) void this.store.load();
    void this.store.refreshUnreadCount();
  }

  protected setFilter(filter: ChatFilter): void {
    if (filter !== this.store.filter() || this.store.error()) void this.store.load(filter);
  }
}
