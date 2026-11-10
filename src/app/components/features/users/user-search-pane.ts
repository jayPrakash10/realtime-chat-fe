import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ApiError } from '../../../api/api-error';
import type { PublicUser } from '../../../api/types';
import { UsersApi } from '../../../api/users.api';
import { LIMITS, SEARCH_DEBOUNCE_MS } from '../../../lib/constants';
import { ToastService } from '../../../services/toast.service';
import { ConversationsStore } from '../../../store/conversations.store';
import { PaneHeader } from '../../layout/pane-header';
import { EmptyState } from '../../ui/empty-state';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { IconButton } from '../../ui/icon-button';
import { InfiniteScroll } from '../../ui/infinite-scroll';
import { Skeleton } from '../../ui/skeleton';
import { Spinner } from '../../ui/spinner';
import { UserRow } from './user-row';

/** "New chat": GET /users?search= (debounced), then POST /conversations on tap. */
@Component({
  selector: 'app-user-search-pane',
  imports: [RouterLink, PaneHeader, EmptyState, ErrorState, Icon, IconButton, InfiniteScroll, Skeleton, Spinner, UserRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <app-pane-header title="New chat">
      <a paneStart appIconButton routerLink="/chats" icon="arrow-left" label="Back to chats"></a>
    </app-pane-header>

    <div class="border-b border-border px-3 py-2">
      <label for="user-search" class="sr-only">Search people by name or username</label>
      <div class="relative">
        <app-icon name="search" size="sm" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-meta" />
        <input
          #searchInput
          id="user-search"
          type="search"
          class="input pl-9"
          placeholder="Search by name or username"
          autocomplete="off"
          [maxLength]="maxLength"
          [value]="query()"
          (input)="onInput($event)"
        />
      </div>
    </div>

    <div #scroller class="min-h-0 flex-1 overflow-y-auto">
      <p class="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-brand-700 uppercase" aria-live="polite">
        {{ term() ? 'Results' : 'People on ChatNest' }}
      </p>
      @if (status() === 'loading') {
        <div role="status" aria-label="Searching">
          @for (row of placeholders; track row) {
            <div class="flex items-center gap-3 px-3 py-2.5">
              <app-skeleton class="size-12 rounded-full" />
              <div class="flex flex-1 flex-col gap-2">
                <app-skeleton class="h-4 w-1/3 rounded-sm" />
                <app-skeleton class="h-3 w-1/2 rounded-sm" />
              </div>
            </div>
          }
        </div>
      } @else if (status() === 'error') {
        <app-error-state title="Search failed" [message]="error()!" (retry)="search(term())" />
      } @else if (!results().length) {
        <app-empty-state
          icon="users"
          title="No people found"
          [description]="term() ? 'Nobody matches “' + term() + '”. Try a username or part of a name.' : 'No other users yet.'"
        />
      } @else {
        <ul aria-label="People">
          @for (user of results(); track user._id) {
            <li>
              <app-user-row [user]="user" [busy]="openingId() === user._id" (message)="startChat(user)" />
            </li>
          }
        </ul>
        @if (hasMore()) {
          <div
            class="flex justify-center py-4"
            appInfiniteScroll
            [appInfiniteScrollRoot]="scroller"
            [appInfiniteScrollDisabled]="loadingMore()"
            (reached)="loadMore()"
          >
            <app-spinner label="Loading more people" />
          </div>
        }
      }
    </div>
  `,
})
export class UserSearchPane {
  private readonly api = inject(UsersApi);
  private readonly conversations = inject(ConversationsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly maxLength = LIMITS.searchMax;
  protected readonly placeholders = [1, 2, 3, 4, 5];
  protected readonly query = signal('');
  protected readonly term = signal('');
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly results = signal<PublicUser[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly openingId = signal<string | null>(null);
  private page = 1;
  private seq = 0;

  constructor() {
    toObservable(this.query)
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => void this.search(value));
    afterNextRender(() => this.searchInput().nativeElement.focus());
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected async search(term: string): Promise<void> {
    const seq = ++this.seq;
    this.term.set(term);
    this.status.set('loading');
    try {
      const result = await this.api.search({ search: term || undefined, page: 1, limit: LIMITS.pageLimit });
      if (seq !== this.seq) return;
      this.results.set(result.items);
      this.page = 1;
      this.hasMore.set(result.meta.page < result.meta.totalPages);
      this.status.set('ready');
    } catch (error) {
      if (seq !== this.seq) return;
      this.error.set(ApiError.from(error).message);
      this.status.set('error');
    }
  }

  protected async loadMore(): Promise<void> {
    if (this.loadingMore()) return;
    const seq = this.seq;
    this.loadingMore.set(true);
    try {
      const next = this.page + 1;
      const result = await this.api.search({ search: this.term() || undefined, page: next, limit: LIMITS.pageLimit });
      if (seq !== this.seq) return;
      this.results.update((users) => [...users, ...result.items.filter((user) => !users.some((u) => u._id === user._id))]);
      this.page = next;
      this.hasMore.set(next < result.meta.totalPages);
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
      this.hasMore.set(false);
    } finally {
      this.loadingMore.set(false);
    }
  }

  protected async startChat(user: PublicUser): Promise<void> {
    if (this.openingId()) return;
    this.openingId.set(user._id);
    try {
      const conversation = await this.conversations.open(user._id);
      await this.router.navigate(['/chats', conversation._id]);
    } catch (error) {
      const apiError = ApiError.from(error);
      this.toast.error(apiError.isCannotMessage ? "You can't message this user." : apiError.message);
    } finally {
      this.openingId.set(null);
    }
  }
}
