import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ApiError } from '../../../api/api-error';
import { MessagesApi } from '../../../api/messages.api';
import type { Message } from '../../../api/types';
import { LIMITS, SEARCH_DEBOUNCE_MS } from '../../../lib/constants';
import { formatChatListTime } from '../../../lib/formatters';
import { highlightMatches } from '../../../lib/highlight';
import { EmptyState } from '../../ui/empty-state';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { InfiniteScroll } from '../../ui/infinite-scroll';
import { Spinner } from '../../ui/spinner';

/**
 * Search inside a chat: GET /conversations/:id/messages?q=. Results show newest first.
 * The API can't load the messages around a match, so results stay in this panel.
 */
@Component({
  selector: 'app-chat-search-panel',
  imports: [EmptyState, ErrorState, Icon, InfiniteScroll, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <div class="border-b border-border p-3">
      <label for="chat-search" class="sr-only">Search messages</label>
      <div class="relative">
        <app-icon name="search" size="sm" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-meta" />
        <input
          #searchInput
          id="chat-search"
          type="search"
          class="input pl-9"
          placeholder="Search messages"
          autocomplete="off"
          [maxLength]="maxLength"
          [value]="query()"
          (input)="onInput($event)"
        />
      </div>
    </div>
    <div #scroller class="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
      @if (!term()) {
        <p class="px-6 py-10 text-center text-sm text-ink-secondary">Type to search text and photo captions in this chat.</p>
      } @else if (status() === 'loading') {
        <div class="flex justify-center py-10"><app-spinner label="Searching" /></div>
      } @else if (status() === 'error') {
        <app-error-state title="Search failed" [message]="error()!" (retry)="search(term())" />
      } @else if (!results().length) {
        <app-empty-state icon="search" title="No messages found" [description]="'Nothing matches “' + term() + '”.'" />
      } @else {
        <ul class="divide-y divide-border/70" aria-label="Search results">
          @for (message of results(); track message._id) {
            <li class="px-4 py-3">
              <div class="flex items-baseline justify-between gap-2 text-xs">
                <span class="font-semibold text-brand-700">{{ message.sender === meId() ? 'You' : otherName() }}</span>
                <time class="text-ink-meta" [attr.datetime]="message.createdAt">{{ time(message.createdAt) }}</time>
              </div>
              <p class="mt-1 line-clamp-3 text-sm wrap-break-word text-ink">
                @if (message.type === 'image') {
                  <app-icon name="camera" size="sm" class="mr-1 align-[-3px] text-ink-meta" />
                }
                @for (segment of highlight(message.text); track $index) {
                  @if (segment.match) {
                    <mark class="rounded-sm bg-brand-200 px-0.5 text-ink">{{ segment.text }}</mark>
                  } @else {
                    {{ segment.text }}
                  }
                }
              </p>
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
            <app-spinner label="Loading more results" />
          </div>
        }
      }
    </div>
  `,
})
export class ChatSearchPanel {
  readonly conversationId = input.required<string>();
  readonly meId = input.required<string | null>();
  readonly otherName = input.required<string>();

  private readonly api = inject(MessagesApi);
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly maxLength = LIMITS.searchMax;
  protected readonly query = signal('');
  protected readonly term = signal('');
  protected readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly error = signal<string | null>(null);
  protected readonly results = signal<Message[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly loadingMore = signal(false);
  private cursor: string | null = null;
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

  protected highlight(text: string) {
    return highlightMatches(text, this.term());
  }

  protected time(iso: string): string {
    return formatChatListTime(iso);
  }

  protected async search(term: string): Promise<void> {
    const seq = ++this.seq;
    this.term.set(term);
    if (!term) {
      this.status.set('idle');
      this.results.set([]);
      return;
    }
    this.status.set('loading');
    try {
      const page = await this.api.list(this.conversationId(), { q: term, limit: LIMITS.messageLimit });
      if (seq !== this.seq) return;
      this.results.set(page.items.filter((message) => !message.isDeletedForEveryone));
      this.cursor = page.meta.nextCursor;
      this.hasMore.set(page.meta.hasMore);
      this.status.set('ready');
    } catch (error) {
      if (seq !== this.seq) return;
      this.error.set(ApiError.from(error).message);
      this.status.set('error');
    }
  }

  protected async loadMore(): Promise<void> {
    if (!this.cursor || this.loadingMore()) return;
    const seq = this.seq;
    this.loadingMore.set(true);
    try {
      const page = await this.api.list(this.conversationId(), {
        q: this.term(),
        limit: LIMITS.messageLimit,
        before: this.cursor,
      });
      if (seq !== this.seq) return;
      this.results.update((items) => [...items, ...page.items.filter((message) => !message.isDeletedForEveryone)]);
      this.cursor = page.meta.nextCursor;
      this.hasMore.set(page.meta.hasMore);
    } catch {
      this.hasMore.set(false);
    } finally {
      this.loadingMore.set(false);
    }
  }
}
