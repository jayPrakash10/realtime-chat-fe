import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Conversation } from '../../../api/types';
import { formatLastSeen } from '../../../lib/formatters';
import type { Presence } from '../../../store/presence.store';
import { Avatar } from '../../ui/avatar';
import { IconButton } from '../../ui/icon-button';
import { Menu, type MenuItem } from '../../ui/menu';

export type ChatPanel = 'contact' | 'media' | 'search';
export type ChatHeaderAction = ChatPanel | 'block' | 'unblock' | 'delete';

@Component({
  selector: 'app-conversation-header',
  imports: [RouterLink, Avatar, IconButton, Menu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-15 shrink-0 items-center gap-1 border-b border-border bg-surface-muted px-2 md:px-4' },
  template: `
    @let user = conversation().otherUser;
    <a appIconButton routerLink="/chats" icon="arrow-left" label="Back to chats" class="md:hidden"></a>
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-3 rounded-sm px-1 py-1 text-left"
      [attr.aria-label]="'Contact info for ' + user.name"
      (click)="action.emit('contact')"
    >
      <app-avatar [name]="user.name" [src]="user.avatarUrl" size="sm" />
      <span class="min-w-0">
        <span class="block truncate text-base font-semibold text-ink">{{ user.name }}</span>
        <span class="block truncate text-xs" [class]="presence().isOnline ? 'text-success-700' : 'text-ink-meta'">
          {{ statusText() }}
        </span>
      </span>
    </button>
    <button
      appIconButton
      type="button"
      icon="search"
      label="Search messages"
      class="hidden sm:inline-flex"
      (click)="action.emit('search')"
    ></button>
    <app-menu label="Chat options" [items]="menuItems()" (selected)="onSelect($event)" />
  `,
})
export class ConversationHeader {
  readonly conversation = input.required<Conversation>();
  readonly presence = input.required<Presence>();
  readonly blockedByMe = input(false);
  readonly action = output<ChatHeaderAction>();

  protected readonly statusText = computed(() =>
    this.presence().isOnline ? 'online' : formatLastSeen(this.presence().lastSeenAt),
  );

  protected readonly menuItems = computed<MenuItem[]>(() => [
    { id: 'contact', label: 'Contact info', icon: 'info' },
    { id: 'media', label: 'Photos', icon: 'image' },
    { id: 'search', label: 'Search messages', icon: 'search' },
    this.blockedByMe()
      ? { id: 'unblock', label: 'Unblock', icon: 'unlock' }
      : { id: 'block', label: 'Block', icon: 'ban', tone: 'danger' },
    { id: 'delete', label: 'Delete chat', icon: 'trash', tone: 'danger' },
  ]);

  protected onSelect(id: string): void {
    this.action.emit(id as ChatHeaderAction);
  }
}
