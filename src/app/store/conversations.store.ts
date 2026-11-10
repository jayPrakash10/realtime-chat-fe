import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError } from '../api/api-error';
import { ConversationsApi } from '../api/conversations.api';
import type { Conversation, ConversationListQuery, Message, SocketEvents, SocketMessage } from '../api/types';
import { toLastMessagePreview } from '../lib/chat-preview';
import { LIMITS } from '../lib/constants';
import { AuthStore } from './auth.store';
import { PresenceStore } from './presence.store';

export type ChatFilter = 'all' | 'unread';

/**
 * The chat list plus every conversation the client knows about.
 * Socket events and sends update it in place, so the list stays live without refetching.
 */
@Injectable({ providedIn: 'root' })
export class ConversationsStore {
  private readonly api = inject(ConversationsApi);
  private readonly presence = inject(PresenceStore);

  private readonly byIdMap = signal<ReadonlyMap<string, Conversation>>(new Map());
  private readonly listIds = signal<readonly string[]>([]);
  private readonly currentFilter = signal<ChatFilter>('all');
  private readonly page = signal(0);
  private readonly totalPages = signal(0);
  private readonly isLoading = signal(false);
  private readonly isLoadingMore = signal(false);
  private readonly loadError = signal<string | null>(null);
  private readonly unreadChatCount = signal(0);
  private requestSeq = 0;

  /** The conversation open on screen. Its incoming messages don't raise the unread count. */
  readonly activeId = signal<string | null>(null);

  readonly filter = this.currentFilter.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly loadingMore = this.isLoadingMore.asReadonly();
  readonly error = this.loadError.asReadonly();
  /** Chats with unread messages (GET /conversations?unread=true → meta.total). */
  readonly unreadChats = this.unreadChatCount.asReadonly();
  readonly loaded = computed(() => this.page() > 0);
  readonly hasMore = computed(() => this.page() < this.totalPages());
  readonly items = computed(() => {
    const map = this.byIdMap();
    return this.listIds()
      .map((id) => map.get(id))
      .filter((conversation): conversation is Conversation => conversation !== undefined);
  });

  constructor() {
    inject(AuthStore).loggedOut.subscribe(() => this.reset());
  }

  byId(id: string): Conversation | undefined {
    return this.byIdMap().get(id);
  }

  async load(filter: ChatFilter = this.currentFilter()): Promise<void> {
    const seq = ++this.requestSeq;
    this.currentFilter.set(filter);
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const result = await this.api.list(this.query(filter, 1));
      if (seq !== this.requestSeq) return;
      this.remember(result.items);
      this.listIds.set(result.items.map((conversation) => conversation._id));
      this.page.set(1);
      this.totalPages.set(result.meta.totalPages);
      if (filter === 'unread') this.unreadChatCount.set(result.meta.total);
    } catch (error) {
      if (seq === this.requestSeq) this.loadError.set(ApiError.from(error).message);
    } finally {
      if (seq === this.requestSeq) this.isLoading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.isLoading() || this.isLoadingMore()) return;
    const seq = this.requestSeq;
    const nextPage = this.page() + 1;
    this.isLoadingMore.set(true);
    this.loadError.set(null);
    try {
      const result = await this.api.list(this.query(this.currentFilter(), nextPage));
      if (seq !== this.requestSeq) return;
      this.remember(result.items);
      this.listIds.update((ids) => [
        ...ids,
        ...result.items.map((conversation) => conversation._id).filter((id) => !ids.includes(id)),
      ]);
      this.page.set(nextPage);
      this.totalPages.set(result.meta.totalPages);
    } catch (error) {
      if (seq === this.requestSeq) this.loadError.set(ApiError.from(error).message);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  /** Silent refresh of the first page (window focus, socket reconnect). */
  async refresh(): Promise<void> {
    void this.refreshUnreadCount();
    if (!this.loaded()) return;
    const seq = this.requestSeq;
    try {
      const result = await this.api.list(this.query(this.currentFilter(), 1));
      if (seq !== this.requestSeq) return;
      this.remember(result.items);
      const fresh = result.items.map((conversation) => conversation._id);
      this.listIds.update((ids) => [...fresh, ...ids.filter((id) => !fresh.includes(id))]);
    } catch {
      // Background refresh: the visible list stays as it was.
    }
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const result = await this.api.list({ unread: true, page: 1, limit: 1 });
      this.unreadChatCount.set(result.meta.total);
    } catch {
      // The badge keeps its last known value.
    }
  }

  /** Always fetches, so the header and presence are current. Rejects with ApiError (404 if not a participant). */
  async fetchOne(id: string): Promise<Conversation> {
    const conversation = await this.api.get(id);
    this.remember([conversation]);
    return conversation;
  }

  /** POST /conversations: get or create the chat with a user, and show it at the top of the list. */
  async open(participantId: string): Promise<Conversation> {
    const conversation = await this.api.open(participantId);
    this.remember([conversation]);
    if (this.currentFilter() === 'all') this.moveToTop(conversation._id);
    return conversation;
  }

  /** message:new from the other user. */
  async applyIncoming(message: SocketMessage, isOpen: boolean): Promise<void> {
    const id = message.conversation;
    const existing = this.byId(id);
    if (!existing || !this.listIds().includes(id)) {
      // New or previously hidden chat: fetch it and put it on top (docs section 8, rule 7).
      try {
        await this.fetchOne(id);
        this.moveToTop(id);
        if (!isOpen) void this.refreshUnreadCount();
      } catch {
        // The next refresh picks it up.
      }
      return;
    }
    const wasUnread = existing.unreadCount > 0;
    this.patch(id, (conversation) => ({
      ...conversation,
      lastMessage: toLastMessagePreview(message),
      lastMessageAt: message.createdAt,
      unreadCount: isOpen ? conversation.unreadCount : conversation.unreadCount + 1,
    }));
    this.moveToTop(id);
    if (!isOpen && !wasUnread) this.unreadChatCount.update((count) => count + 1);
  }

  /** After a successful send: replying also counts as reading (docs section 8, rule 6). */
  applyOwnMessage(message: Message): void {
    const wasUnread = (this.byId(message.conversation)?.unreadCount ?? 0) > 0;
    this.patch(message.conversation, (conversation) => ({
      ...conversation,
      lastMessage: toLastMessagePreview(message),
      lastMessageAt: message.createdAt,
      unreadCount: 0,
      lastReadAt: message.createdAt,
    }));
    if (this.byId(message.conversation)) this.moveToTop(message.conversation);
    if (wasUnread) this.decrementUnreadChats();
  }

  applyRead({ conversationId, readAt }: SocketEvents['conversation:read']): void {
    this.patch(conversationId, (conversation) => ({ ...conversation, otherLastReadAt: readAt }));
  }

  applyDeleted(conversationId: string, messageId: string): void {
    this.patch(conversationId, (conversation) =>
      conversation.lastMessage?.messageId === messageId
        ? { ...conversation, lastMessage: { ...conversation.lastMessage, isDeleted: true, text: '' } }
        : conversation,
    );
  }

  /** PATCH /conversations/:id/read. Optimistic: the badge clears immediately. */
  async markRead(id: string, onlyIfUnread = false): Promise<void> {
    const conversation = this.byId(id);
    if (onlyIfUnread && (!conversation || conversation.unreadCount === 0)) return;
    const wasUnread = (conversation?.unreadCount ?? 0) > 0;
    this.patch(id, (current) => ({ ...current, unreadCount: 0 }));
    if (wasUnread) this.decrementUnreadChats();
    try {
      const result = await this.api.markRead(id);
      this.patch(id, (current) => ({ ...current, lastReadAt: result.lastReadAt }));
    } catch {
      // Not critical: the server count is corrected on the next refresh.
    }
  }

  /** DELETE /conversations/:id: hides the chat for the current user only. */
  async remove(id: string): Promise<void> {
    await this.api.remove(id);
    const wasUnread = (this.byId(id)?.unreadCount ?? 0) > 0;
    this.listIds.update((ids) => ids.filter((existing) => existing !== id));
    this.byIdMap.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
    if (wasUnread) this.decrementUnreadChats();
  }

  private query(filter: ChatFilter, page: number): ConversationListQuery {
    return { page, limit: LIMITS.pageLimit, ...(filter === 'unread' ? { unread: true } : {}) };
  }

  private remember(conversations: readonly Conversation[]): void {
    if (!conversations.length) return;
    this.byIdMap.update((map) => {
      const next = new Map(map);
      for (const conversation of conversations) next.set(conversation._id, conversation);
      return next;
    });
    for (const conversation of conversations) this.presence.seed(conversation.otherUser);
  }

  private patch(id: string, change: (conversation: Conversation) => Conversation): void {
    const current = this.byIdMap().get(id);
    if (!current) return;
    this.byIdMap.update((map) => new Map(map).set(id, change(current)));
  }

  private moveToTop(id: string): void {
    this.listIds.update((ids) => [id, ...ids.filter((existing) => existing !== id)]);
  }

  private decrementUnreadChats(): void {
    this.unreadChatCount.update((count) => Math.max(0, count - 1));
  }

  private reset(): void {
    this.requestSeq++;
    this.byIdMap.set(new Map());
    this.listIds.set([]);
    this.currentFilter.set('all');
    this.page.set(0);
    this.totalPages.set(0);
    this.isLoading.set(false);
    this.isLoadingMore.set(false);
    this.loadError.set(null);
    this.unreadChatCount.set(0);
    this.activeId.set(null);
  }
}
