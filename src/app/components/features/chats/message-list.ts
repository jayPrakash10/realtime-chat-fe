import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { DeleteScope, Message } from '../../../api/types';
import { buildMessageRows, type PendingMessage } from '../../../lib/message-rows';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Icon } from '../../ui/icon';
import { InfiniteScroll } from '../../ui/infinite-scroll';
import { Spinner } from '../../ui/spinner';
import { MessageBubble } from './message-bubble';
import { PendingBubble } from './pending-bubble';

export interface DeleteRequest {
  message: Message;
  scope: DeleteScope;
}

const NEAR_BOTTOM_PX = 80;

/**
 * Scrollable history. It sticks to the bottom for new messages (unless the user scrolled up,
 * in which case a "new messages" button appears) and keeps the position when older pages load.
 */
@Component({
  selector: 'app-message-list',
  imports: [Badge, Button, Icon, InfiniteScroll, Spinner, MessageBubble, PendingBubble],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative flex min-h-0 flex-1 flex-col' },
  template: `
    <div
      #viewport
      class="chat-wallpaper min-h-0 flex-1 overflow-y-auto px-3 py-2 md:px-[6%]"
      role="log"
      aria-label="Messages"
      (scroll)="onScroll()"
    >
      @if (hasMore()) {
        <div
          class="flex justify-center py-3"
          appInfiniteScroll
          [appInfiniteScrollRoot]="viewport"
          [appInfiniteScrollDisabled]="loadingOlder() || !!olderError()"
          (reached)="requestOlder()"
        >
          @if (olderError()) {
            <button appButton variant="secondary" size="sm" type="button" (click)="requestOlder()">
              Couldn't load older messages. Retry
            </button>
          } @else {
            <app-spinner label="Loading older messages" />
          }
        </div>
      } @else if (rows().length) {
        <p class="mx-auto my-3 max-w-sm rounded-md bg-surface px-3 py-2 text-center text-xs text-ink-secondary shadow-bubble">
          This is the start of your chat with {{ otherName() }}.
        </p>
      }

      <ol class="flex flex-col gap-0.5">
        @for (row of rows(); track row.key) {
          @if (row.kind === 'date') {
            <li class="sticky top-1 z-10 my-2 flex justify-center">
              <span class="rounded-md bg-surface px-3 py-1 text-xs font-medium text-ink-secondary shadow-bubble">
                {{ row.label }}
              </span>
            </li>
          } @else if (row.kind === 'message') {
            <li [class.mt-2]="row.groupStart">
              <app-message-bubble
                [message]="row.message"
                [mine]="row.mine"
                [status]="row.status"
                [groupStart]="row.groupStart"
                [meId]="meId()"
                (deleteRequested)="deleteMessage.emit({ message: row.message, scope: $event })"
                (viewImage)="viewImage.emit(row.message)"
                (imageLoaded)="onImageLoaded()"
              />
            </li>
          } @else {
            <li [class.mt-2]="row.groupStart">
              <app-pending-bubble
                [pending]="row.pending"
                [groupStart]="row.groupStart"
                (retry)="retry.emit(row.pending.tempId)"
                (discard)="discard.emit(row.pending.tempId)"
              />
            </li>
          }
        }
      </ol>
    </div>

    @if (!atBottom()) {
      <button
        type="button"
        class="absolute right-4 bottom-4 flex size-11 items-center justify-center rounded-full bg-surface text-ink-secondary shadow-pop hover:text-ink"
        [attr.aria-label]="unseen() ? unseen() + ' new messages. Scroll to latest' : 'Scroll to latest messages'"
        (click)="scrollToBottom()"
      >
        <app-icon name="arrow-down" />
        @if (unseen() > 0) {
          <app-badge class="absolute -top-1 -right-1" [count]="unseen()" label="" aria-hidden="true" />
        }
      </button>
    }
  `,
})
export class MessageList {
  readonly messages = input.required<readonly Message[]>();
  readonly pending = input.required<readonly PendingMessage[]>();
  readonly meId = input.required<string | null>();
  readonly otherLastReadAt = input<string | null>(null);
  readonly otherName = input.required<string>();
  readonly hasMore = input(false);
  readonly loadingOlder = input(false);
  readonly olderError = input<string | null>(null);

  readonly loadOlder = output<void>();
  readonly deleteMessage = output<DeleteRequest>();
  readonly viewImage = output<Message>();
  readonly retry = output<string>();
  readonly discard = output<string>();

  protected readonly atBottom = signal(true);
  protected readonly unseen = signal(0);
  protected readonly rows = computed(() =>
    buildMessageRows(this.messages(), this.pending(), this.meId(), this.otherLastReadAt()),
  );

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  /** Distance from the bottom to restore after older messages are prepended. */
  private anchorFromBottom: number | null = null;
  private lastKey: string | null | undefined = undefined;

  constructor() {
    afterRenderEffect(() => {
      const rows = this.rows();
      const element = this.viewport().nativeElement;
      const last = rows[rows.length - 1];
      const lastKey = last?.key ?? null;

      if (this.anchorFromBottom !== null) {
        element.scrollTop = element.scrollHeight - this.anchorFromBottom;
        this.anchorFromBottom = null;
      } else if (lastKey !== this.lastKey) {
        const mine = last?.kind === 'pending' || (last?.kind === 'message' && last.mine);
        if (this.lastKey === undefined || this.atBottom() || mine) {
          element.scrollTop = element.scrollHeight;
          this.unseen.set(0);
        } else if (last) {
          this.unseen.update((count) => count + 1);
        }
      }
      this.lastKey = lastKey;
    });
  }

  protected requestOlder(): void {
    const element = this.viewport().nativeElement;
    this.anchorFromBottom = element.scrollHeight - element.scrollTop;
    this.loadOlder.emit();
  }

  protected onScroll(): void {
    const element = this.viewport().nativeElement;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
    this.atBottom.set(nearBottom);
    if (nearBottom) this.unseen.set(0);
  }

  protected onImageLoaded(): void {
    if (this.atBottom()) this.scrollToBottom('auto');
  }

  protected scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const element = this.viewport().nativeElement;
    element.scrollTo({ top: element.scrollHeight, behavior });
    this.unseen.set(0);
  }
}
