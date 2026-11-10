import { Injectable, inject, signal } from '@angular/core';
import { ApiError } from '../api/api-error';
import { MessagesApi } from '../api/messages.api';
import type { DeleteScope, Message } from '../api/types';
import { LIMITS } from '../lib/constants';
import { compareIds } from '../lib/ids';
import type { PendingMessage } from '../lib/message-rows';
import { AuthStore } from './auth.store';
import { ConversationsStore } from './conversations.store';

export interface ThreadState {
  /** Chronological: oldest first, ready to render top to bottom. */
  items: readonly Message[];
  nextCursor: string | null;
  hasMore: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadingOlder: boolean;
  olderError: string | null;
}

const EMPTY_THREAD: ThreadState = {
  items: [],
  nextCursor: null,
  hasMore: false,
  status: 'idle',
  error: null,
  loadingOlder: false,
  olderError: null,
};

/** Message history per conversation (cursor pagination) and messages still being sent. */
@Injectable({ providedIn: 'root' })
export class MessagesStore {
  private readonly api = inject(MessagesApi);
  private readonly conversations = inject(ConversationsStore);

  private readonly threads = signal<ReadonlyMap<string, ThreadState>>(new Map());
  private readonly pendingMessages = signal<readonly PendingMessage[]>([]);
  /** Chats where the API answered "You cannot message this user" (a block on either side, or a ban). */
  private readonly blockedChats = signal<ReadonlySet<string>>(new Set());
  private tempSeq = 0;

  constructor() {
    inject(AuthStore).loggedOut.subscribe(() => this.reset());
  }

  thread(conversationId: string): ThreadState {
    return this.threads().get(conversationId) ?? EMPTY_THREAD;
  }

  pending(conversationId: string): PendingMessage[] {
    return this.pendingMessages().filter((item) => item.conversationId === conversationId);
  }

  cannotMessage(conversationId: string): boolean {
    return this.blockedChats().has(conversationId);
  }

  clearCannotMessage(conversationId: string): void {
    this.blockedChats.update((set) => {
      const next = new Set(set);
      next.delete(conversationId);
      return next;
    });
  }

  async loadInitial(conversationId: string): Promise<void> {
    if (this.thread(conversationId).status === 'ready') {
      await this.refreshLatest(conversationId);
      return;
    }
    this.update(conversationId, (thread) => ({ ...thread, status: 'loading', error: null }));
    try {
      const page = await this.api.list(conversationId, { limit: LIMITS.messageLimit });
      this.update(conversationId, (thread) => ({
        ...thread,
        items: [...page.items].reverse(),
        nextCursor: page.meta.nextCursor,
        hasMore: page.meta.hasMore,
        status: 'ready',
      }));
    } catch (error) {
      this.update(conversationId, (thread) => ({ ...thread, status: 'error', error: ApiError.from(error).message }));
    }
  }

  async loadOlder(conversationId: string): Promise<void> {
    const thread = this.thread(conversationId);
    if (thread.status !== 'ready' || thread.loadingOlder || !thread.hasMore || !thread.nextCursor) return;
    this.update(conversationId, (current) => ({ ...current, loadingOlder: true, olderError: null }));
    try {
      const page = await this.api.list(conversationId, { limit: LIMITS.messageLimit, before: thread.nextCursor });
      this.update(conversationId, (current) => {
        const known = new Set(current.items.map((message) => message._id));
        const older = [...page.items].reverse().filter((message) => !known.has(message._id));
        return {
          ...current,
          items: [...older, ...current.items],
          nextCursor: page.meta.nextCursor,
          hasMore: page.meta.hasMore,
          loadingOlder: false,
        };
      });
    } catch (error) {
      this.update(conversationId, (current) => ({
        ...current,
        loadingOlder: false,
        olderError: ApiError.from(error).message,
      }));
    }
  }

  /**
   * Re-fetches the newest page and merges it. The fresh page is authoritative for its
   * range, which picks up deletions and messages missed while offline.
   */
  async refreshLatest(conversationId: string): Promise<void> {
    if (this.thread(conversationId).status !== 'ready') return;
    try {
      const page = await this.api.list(conversationId, { limit: LIMITS.messageLimit });
      const fresh = [...page.items].reverse();
      this.update(conversationId, (thread) => {
        const oldestFresh = fresh[0]?._id;
        const newestKnown = thread.items[thread.items.length - 1]?._id;
        if (!oldestFresh || !newestKnown || compareIds(oldestFresh, newestKnown) > 0) {
          // Empty chat, or a gap between what we had and the new page: start over from the fresh page.
          return { ...thread, items: fresh, nextCursor: page.meta.nextCursor, hasMore: page.meta.hasMore };
        }
        const older = thread.items.filter((message) => compareIds(message._id, oldestFresh) < 0);
        return { ...thread, items: [...older, ...fresh] };
      });
    } catch {
      // Keep what is on screen.
    }
  }

  /** message:new from the other user. */
  appendIncoming(message: Message): void {
    this.insert(message);
  }

  markDeletedForEveryone(conversationId: string, messageId: string): void {
    this.update(conversationId, (thread) => ({
      ...thread,
      items: thread.items.map((message) =>
        message._id === messageId ? { ...message, isDeletedForEveryone: true, text: '', imageUrl: null } : message,
      ),
    }));
  }

  async deleteMessage(message: Message, scope: DeleteScope): Promise<void> {
    await this.api.remove(message._id, scope);
    if (scope === 'me') {
      this.update(message.conversation, (thread) => ({
        ...thread,
        items: thread.items.filter((item) => item._id !== message._id),
      }));
    } else {
      this.markDeletedForEveryone(message.conversation, message._id);
      this.conversations.applyDeleted(message.conversation, message._id);
    }
  }

  sendText(conversationId: string, text: string): Promise<void> {
    const pending = this.addPending(conversationId, text, null);
    return this.deliver(pending.tempId);
  }

  sendImage(conversationId: string, file: File, caption: string): Promise<void> {
    const pending = this.addPending(conversationId, caption, file);
    return this.deliver(pending.tempId);
  }

  retry(tempId: string): Promise<void> {
    this.patchPending(tempId, { state: 'sending', error: null, progress: 0 });
    return this.deliver(tempId);
  }

  discard(tempId: string): void {
    this.dropPending(tempId);
  }

  private addPending(conversationId: string, text: string, file: File | null): PendingMessage {
    const pending: PendingMessage = {
      tempId: `pending-${++this.tempSeq}`,
      conversationId,
      text,
      file,
      previewUrl: file ? URL.createObjectURL(file) : null,
      createdAt: new Date().toISOString(),
      state: 'sending',
      progress: 0,
      error: null,
    };
    this.pendingMessages.update((list) => [...list, pending]);
    return pending;
  }

  private async deliver(tempId: string): Promise<void> {
    const pending = this.pendingMessages().find((item) => item.tempId === tempId);
    if (!pending) return;
    try {
      const message = pending.file
        ? await this.api.sendImage(pending.conversationId, pending.file, pending.text, {
            onProgress: (progress) => this.patchPending(tempId, { progress }),
          })
        : await this.api.sendText(pending.conversationId, pending.text);
      this.insert(message);
      this.dropPending(tempId);
      this.conversations.applyOwnMessage(message);
    } catch (error) {
      const apiError = ApiError.from(error);
      this.patchPending(tempId, { state: 'failed', error: apiError.message, progress: 0 });
      if (apiError.isCannotMessage) {
        this.blockedChats.update((set) => new Set(set).add(pending.conversationId));
      }
    }
  }

  private insert(message: Message): void {
    if (this.thread(message.conversation).status !== 'ready') return;
    this.update(message.conversation, (thread) => {
      const items = thread.items.filter((item) => item._id !== message._id);
      const index = items.findIndex((item) => compareIds(item._id, message._id) > 0);
      if (index === -1) items.push(message);
      else items.splice(index, 0, message);
      return { ...thread, items };
    });
  }

  private update(conversationId: string, change: (thread: ThreadState) => ThreadState): void {
    this.threads.update((map) => new Map(map).set(conversationId, change(map.get(conversationId) ?? EMPTY_THREAD)));
  }

  private patchPending(tempId: string, patch: Partial<PendingMessage>): void {
    this.pendingMessages.update((list) => list.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)));
  }

  private dropPending(tempId: string): void {
    const pending = this.pendingMessages().find((item) => item.tempId === tempId);
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    this.pendingMessages.update((list) => list.filter((item) => item.tempId !== tempId));
  }

  private reset(): void {
    for (const pending of this.pendingMessages()) {
      if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    }
    this.threads.set(new Map());
    this.pendingMessages.set([]);
    this.blockedChats.set(new Set());
  }
}
