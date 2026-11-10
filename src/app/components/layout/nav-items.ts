import { computed, inject, type Signal } from '@angular/core';
import { AuthStore } from '../../store/auth.store';
import { ConversationsStore } from '../../store/conversations.store';
import type { IconName } from '../ui/icon';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  /** Number shown in a badge (0 = none). */
  badge: number;
  /** Full accessible name, including the badge count. */
  ariaLabel: string;
}

/** Main navigation shared by the desktop rail and the mobile bottom bar. Call in an injection context. */
export function injectNavItems(): Signal<NavItem[]> {
  const auth = inject(AuthStore);
  const conversations = inject(ConversationsStore);
  return computed(() => {
    const unread = conversations.unreadChats();
    const items: NavItem[] = [
      {
        path: '/chats',
        label: 'Chats',
        icon: 'chat',
        badge: unread,
        ariaLabel: unread ? `Chats, ${unread} with unread messages` : 'Chats',
      },
      { path: '/search', label: 'New chat', icon: 'edit', badge: 0, ariaLabel: 'New chat' },
      { path: '/settings', label: 'Settings', icon: 'settings', badge: 0, ariaLabel: 'Settings' },
    ];
    if (auth.isAdmin()) {
      items.push({ path: '/admin/users', label: 'Admin', icon: 'shield', badge: 0, ariaLabel: 'Admin: manage users' });
    }
    return items;
  });
}
