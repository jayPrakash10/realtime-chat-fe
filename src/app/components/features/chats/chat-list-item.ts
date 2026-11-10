import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Conversation } from '../../../api/types';
import { buildChatPreview } from '../../../lib/chat-preview';
import { formatChatListTime } from '../../../lib/formatters';
import { resolveStatus } from '../../../lib/message-status';
import { PresenceStore } from '../../../store/presence.store';
import { Avatar } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Icon } from '../../ui/icon';
import { MessageTicks } from './message-ticks';

@Component({
  selector: 'app-chat-list-item',
  imports: [RouterLink, Avatar, Badge, Icon, MessageTicks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = conversation();
    <a
      [routerLink]="['/chats', c._id]"
      class="flex items-center gap-3 px-3 py-3 transition-colors focus-visible:-outline-offset-2"
      [class]="active() ? 'bg-brand-50' : 'hover:bg-surface-muted'"
      [attr.aria-current]="active() ? 'page' : null"
    >
      <app-avatar [name]="c.otherUser.name" [src]="c.otherUser.avatarUrl" [online]="isOnline()" />
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-2">
          <span class="truncate text-base font-medium text-ink">{{ c.otherUser.name }}</span>
          <time
            class="shrink-0 text-xs"
            [class]="c.unreadCount > 0 ? 'font-semibold text-brand-700' : 'text-ink-meta'"
            [attr.datetime]="c.lastMessageAt"
            >{{ time() }}</time
          >
        </div>
        <div class="mt-0.5 flex items-center justify-between gap-2">
          <p class="flex min-w-0 items-center gap-1 text-sm text-ink-secondary">
            @if (preview().isMine) {
              <span class="sr-only">You:</span>
              @if (ownStatus(); as status) {
                <app-message-ticks [status]="status" />
              }
            }
            @if (preview().isPhoto) {
              <app-icon name="camera" size="sm" />
            }
            <span class="truncate" [class.italic]="preview().isMuted">{{ preview().text }}</span>
          </p>
          @if (c.unreadCount > 0) {
            <app-badge [count]="c.unreadCount" [label]="c.unreadCount + ' unread messages'" />
          }
        </div>
      </div>
    </a>
  `,
})
export class ChatListItem {
  readonly conversation = input.required<Conversation>();
  readonly meId = input.required<string | null>();
  readonly active = input(false);

  private readonly presence = inject(PresenceStore);

  protected readonly isOnline = computed(() => this.presence.of(this.conversation().otherUser).isOnline);
  protected readonly preview = computed(() => buildChatPreview(this.conversation().lastMessage, this.meId()));
  protected readonly time = computed(() => formatChatListTime(this.conversation().lastMessageAt));
  protected readonly ownStatus = computed(() => {
    const { lastMessage, otherLastReadAt } = this.conversation();
    if (!lastMessage || lastMessage.isDeleted) return null;
    return resolveStatus(lastMessage, this.meId(), otherLastReadAt);
  });
}
