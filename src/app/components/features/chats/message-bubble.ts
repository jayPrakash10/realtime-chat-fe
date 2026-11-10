import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { DeleteScope, Message, MessageStatus } from '../../../api/types';
import { formatTime } from '../../../lib/formatters';
import { MediaUrlPipe } from '../../../lib/media-url';
import { canDeleteForEveryone } from '../../../lib/message-status';
import { Icon } from '../../ui/icon';
import { Menu, type MenuItem } from '../../ui/menu';
import { MessageTicks } from './message-ticks';

/** One message: text, image + caption, or the "deleted" placeholder, with its own actions menu. */
@Component({
  selector: 'app-message-bubble',
  imports: [NgTemplateOutlet, Icon, Menu, MessageTicks, MediaUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'group flex items-start gap-1', '[class.justify-end]': 'mine()' },
  template: `
    @let m = message();
    <div
      class="mt-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
      [class.order-last]="!mine()"
    >
      <app-menu
        label="Message options"
        size="sm"
        icon="chevron-down"
        [align]="mine() ? 'end' : 'start'"
        [items]="menuItems()"
        (opened)="now.set(Date.now())"
        (selected)="onMenu($event)"
      />
    </div>

    <div
      class="relative flow-root max-w-[85%] rounded-md px-2 pt-1.5 pb-2 shadow-bubble sm:max-w-[65%]"
      [class]="bubbleClass()"
    >
      @if (m.isDeletedForEveryone) {
        <p class="text-sm text-ink-meta italic">
          <app-icon name="ban" size="sm" class="mr-1 align-[-3px]" />This message was deleted
          <ng-container [ngTemplateOutlet]="meta" />
        </p>
      } @else {
        @if (m.type === 'image' && m.imageUrl) {
          <button
            type="button"
            class="-mx-1 mb-1 block overflow-hidden rounded-sm"
            [attr.aria-label]="m.text ? 'Open photo: ' + m.text : 'Open photo'"
            (click)="viewImage.emit()"
          >
            <img
              [src]="m.imageUrl | mediaUrl"
              [alt]="m.text ? 'Photo: ' + m.text : 'Photo'"
              class="max-h-80 w-full min-w-48 object-cover"
              loading="lazy"
              (load)="imageLoaded.emit()"
            />
          </button>
        }
        @if (m.text) {
          <p class="text-base wrap-break-word whitespace-pre-wrap text-ink">{{ m.text }}<ng-container [ngTemplateOutlet]="meta" /></p>
        } @else {
          <span class="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-ink/55 px-1.5 py-0.5 text-2xs text-white">
            <ng-container [ngTemplateOutlet]="metaContent" />
          </span>
        }
      }
    </div>

    <!-- Floated right at the end of the text: it sits on the last line when there is room, otherwise drops below. -->
    <ng-template #meta>
      <span class="relative top-1.5 float-right ml-3 inline-flex items-center gap-1 text-2xs text-ink-meta not-italic">
        <ng-container [ngTemplateOutlet]="metaContent" />
      </span>
    </ng-template>

    <ng-template #metaContent>
      <time [attr.datetime]="m.createdAt">{{ time() }}</time>
      @if (status(); as s) {
        <app-message-ticks [status]="s" />
      }
    </ng-template>
  `,
})
export class MessageBubble {
  readonly message = input.required<Message>();
  readonly mine = input.required<boolean>();
  readonly status = input<MessageStatus | null>(null);
  readonly groupStart = input(false);
  readonly meId = input.required<string | null>();

  readonly deleteRequested = output<DeleteScope>();
  readonly viewImage = output<void>();
  readonly imageLoaded = output<void>();

  protected readonly Date = Date;
  /** Captured when the menu opens, so the 15-minute rule uses the time of the click. */
  protected readonly now = signal(Date.now());

  protected readonly time = computed(() => formatTime(this.message().createdAt));

  protected readonly bubbleClass = computed(() => {
    const color = this.mine() ? 'bg-brand-100' : 'bg-surface';
    if (!this.groupStart()) return color;
    return this.mine() ? `${color} rounded-tr-none bubble-tail-out` : `${color} rounded-tl-none bubble-tail-in`;
  });

  protected readonly menuItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [{ id: 'me', label: 'Delete for me', icon: 'trash' }];
    if (canDeleteForEveryone(this.message(), this.meId(), this.now())) {
      items.push({ id: 'everyone', label: 'Delete for everyone', icon: 'trash', tone: 'danger' });
    }
    return items;
  });

  protected onMenu(id: string): void {
    this.deleteRequested.emit(id === 'everyone' ? 'everyone' : 'me');
  }
}
