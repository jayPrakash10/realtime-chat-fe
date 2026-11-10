import { Injectable, Injector, computed, effect, inject, untracked } from '@angular/core';
import { AuthStore } from '../store/auth.store';
import { ConversationsStore } from '../store/conversations.store';
import { MessagesStore } from '../store/messages.store';
import { PresenceStore } from '../store/presence.store';
import { RealtimeService } from './realtime.service';
import type { ConnectionStatus, RealtimeEvent } from './realtime.types';

/**
 * Connects the socket for the logged-in user and routes every event to the stores
 * (docs section 6.2). It also re-syncs after reconnects and when the tab becomes visible.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeSyncService {
  private readonly injector = inject(Injector);
  private readonly auth = inject(AuthStore);
  private readonly realtime = inject(RealtimeService);
  private readonly conversations = inject(ConversationsStore);
  private readonly messages = inject(MessagesStore);
  private readonly presence = inject(PresenceStore);

  private started = false;
  private connectedUserId: string | null = null;
  private hasConnectedBefore = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    const userId = computed(() => this.auth.me()?._id ?? null);
    effect(
      () => {
        const id = userId();
        untracked(() => this.onSessionChange(id));
      },
      { injector: this.injector },
    );
    effect(
      () => {
        const status = this.realtime.status();
        untracked(() => this.onStatusChange(status));
      },
      { injector: this.injector },
    );

    this.realtime.events$.subscribe((event) => this.handle(event));
    this.realtime.kicked$.subscribe(() => void this.auth.verify());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.resync();
    });
  }

  private onSessionChange(userId: string | null): void {
    if (userId === this.connectedUserId) return;
    this.connectedUserId = userId;
    this.hasConnectedBefore = false;
    const token = this.auth.token();
    if (userId && token) void this.realtime.connect(token);
    else this.realtime.disconnect();
  }

  private onStatusChange(status: ConnectionStatus): void {
    if (status !== 'connected') return;
    // Events sent while we were disconnected are lost, so refetch after a reconnect.
    if (this.hasConnectedBefore) this.resync();
    this.hasConnectedBefore = true;
  }

  private resync(): void {
    if (this.auth.status() !== 'authenticated') return;
    void this.conversations.refresh();
    const activeId = this.conversations.activeId();
    if (activeId) {
      void this.messages.refreshLatest(activeId);
      void this.conversations.markRead(activeId, true);
    }
  }

  private handle(event: RealtimeEvent): void {
    switch (event.type) {
      case 'message:new': {
        const message = event.payload;
        const isOpen =
          this.conversations.activeId() === message.conversation && document.visibilityState === 'visible';
        this.messages.appendIncoming(message);
        void this.conversations.applyIncoming(message, isOpen);
        if (isOpen) void this.conversations.markRead(message.conversation);
        break;
      }
      case 'message:deleted':
        this.messages.markDeletedForEveryone(event.payload.conversationId, event.payload.messageId);
        this.conversations.applyDeleted(event.payload.conversationId, event.payload.messageId);
        break;
      case 'conversation:read':
        this.conversations.applyRead(event.payload);
        break;
      case 'user:online':
        this.presence.setOnline(event.payload.userId);
        break;
      case 'user:offline':
        this.presence.setOffline(event.payload.userId, event.payload.lastSeenAt);
        break;
    }
  }
}
