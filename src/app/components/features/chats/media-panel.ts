import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../api/api-error';
import { MessagesApi } from '../../../api/messages.api';
import type { Message } from '../../../api/types';
import { LIMITS } from '../../../lib/constants';
import { MediaUrlPipe } from '../../../lib/media-url';
import { EmptyState } from '../../ui/empty-state';
import { ErrorState } from '../../ui/error-state';
import { InfiniteScroll } from '../../ui/infinite-scroll';
import { Skeleton } from '../../ui/skeleton';
import { Spinner } from '../../ui/spinner';

/** Photos in this chat: GET /conversations/:id/messages?type=image with cursor paging. */
@Component({
  selector: 'app-media-panel',
  imports: [MediaUrlPipe, EmptyState, ErrorState, InfiniteScroll, Skeleton, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <div #scroller class="h-full overflow-y-auto p-3">
      @if (status() === 'loading') {
        <div class="grid grid-cols-3 gap-1.5" role="status" aria-label="Loading photos">
          @for (tile of placeholders; track tile) {
            <app-skeleton class="aspect-square rounded-sm" />
          }
        </div>
      } @else if (status() === 'error') {
        <app-error-state title="Couldn't load photos" [message]="error()!" (retry)="reload()" />
      } @else if (!items().length) {
        <app-empty-state icon="image" title="No photos yet" description="Photos you and your contact share will appear here." />
      } @else {
        <ul class="grid grid-cols-3 gap-1.5" aria-label="Photos">
          @for (message of items(); track message._id) {
            <li>
              <button
                type="button"
                class="block aspect-square w-full overflow-hidden rounded-sm bg-skeleton"
                [attr.aria-label]="message.text ? 'Open photo: ' + message.text : 'Open photo'"
                (click)="open.emit(message)"
              >
                <img [src]="message.imageUrl | mediaUrl" alt="" class="size-full object-cover" loading="lazy" />
              </button>
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
            <app-spinner label="Loading more photos" />
          </div>
        }
      }
    </div>
  `,
})
export class MediaPanel {
  readonly conversationId = input.required<string>();
  readonly open = output<Message>();

  private readonly api = inject(MessagesApi);

  protected readonly placeholders = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<Message[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly loadingMore = signal(false);
  private cursor: string | null = null;

  constructor() {
    effect(() => {
      this.conversationId();
      untracked(() => void this.reload());
    });
  }

  protected async reload(): Promise<void> {
    this.status.set('loading');
    try {
      const page = await this.api.list(this.conversationId(), { type: 'image', limit: LIMITS.messageLimit });
      this.items.set(page.items.filter((message) => !!message.imageUrl));
      this.cursor = page.meta.nextCursor;
      this.hasMore.set(page.meta.hasMore);
      this.status.set('ready');
    } catch (error) {
      this.error.set(ApiError.from(error).message);
      this.status.set('error');
    }
  }

  protected async loadMore(): Promise<void> {
    if (!this.cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const page = await this.api.list(this.conversationId(), {
        type: 'image',
        limit: LIMITS.messageLimit,
        before: this.cursor,
      });
      this.items.update((items) => [...items, ...page.items.filter((message) => !!message.imageUrl)]);
      this.cursor = page.meta.nextCursor;
      this.hasMore.set(page.meta.hasMore);
    } catch {
      this.hasMore.set(false);
    } finally {
      this.loadingMore.set(false);
    }
  }
}
