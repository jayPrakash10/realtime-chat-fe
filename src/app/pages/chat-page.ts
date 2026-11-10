import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../api/api-error';
import type { Message } from '../api/types';
import { ChatSearchPanel } from '../components/features/chats/chat-search-panel';
import { Composer } from '../components/features/chats/composer';
import { ComposerNotice } from '../components/features/chats/composer-notice';
import { ConversationHeader, type ChatHeaderAction, type ChatPanel } from '../components/features/chats/conversation-header';
import { ImageLightbox, type LightboxImage } from '../components/features/chats/image-lightbox';
import { ImageSendSheet } from '../components/features/chats/image-send-sheet';
import { MediaPanel } from '../components/features/chats/media-panel';
import { MessageList, type DeleteRequest } from '../components/features/chats/message-list';
import { MessageListSkeleton } from '../components/features/chats/message-list-skeleton';
import { ProfileView } from '../components/features/users/profile-view';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorState } from '../components/ui/error-state';
import { SidePanel } from '../components/ui/side-panel';
import { Skeleton } from '../components/ui/skeleton';
import { ConfirmService } from '../services/confirm.service';
import { ToastService } from '../services/toast.service';
import { AuthStore } from '../store/auth.store';
import { BlocksStore } from '../store/blocks.store';
import { ConversationsStore } from '../store/conversations.store';
import { MessagesStore } from '../store/messages.store';
import { PresenceStore } from '../store/presence.store';

const PANEL_TITLES: Record<ChatPanel, string> = {
  contact: 'Contact info',
  media: 'Photos',
  search: 'Search messages',
};

/** /chats/:conversationId: header, history, composer and side panels (docs section 7.3–7.5). */
@Component({
  selector: 'app-chat-page',
  imports: [
    RouterLink,
    Button,
    ChatSearchPanel,
    Composer,
    ComposerNotice,
    ConversationHeader,
    EmptyState,
    ErrorState,
    ImageLightbox,
    ImageSendSheet,
    MediaPanel,
    MessageList,
    MessageListSkeleton,
    ProfileView,
    SidePanel,
    Skeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    @switch (status()) {
      @case ('loading') {
        <div class="flex h-15 shrink-0 items-center gap-3 border-b border-border bg-surface-muted px-4" aria-hidden="true">
          <app-skeleton class="size-10 rounded-full" />
          <app-skeleton class="h-4 w-36 rounded-sm" />
        </div>
        <app-message-list-skeleton />
      }
      @case ('not-found') {
        <app-empty-state class="flex-1" icon="chat" title="Chat not found" description="It doesn't exist, or you're not part of it.">
          <a appButton variant="secondary" routerLink="/chats">Back to chats</a>
        </app-empty-state>
      }
      @case ('error') {
        <app-error-state class="flex-1" title="Couldn't open this chat" [message]="loadError()!" (retry)="open(conversationId())" />
      }
      @default {
        @if (conversation(); as conv) {
          <div class="relative flex min-h-0 flex-1">
            <div class="flex min-w-0 flex-1 flex-col">
              <app-conversation-header
                [conversation]="conv"
                [presence]="presence()!"
                [blockedByMe]="blockedByMe()"
                (action)="onHeaderAction($event)"
              />

              @for (key of [conv._id]; track key) {
                @switch (thread().status) {
                  @case ('error') {
                    <app-error-state class="flex-1" title="Couldn't load messages" [message]="thread().error!" (retry)="reloadMessages()" />
                  }
                  @case ('ready') {
                    <app-message-list
                      [messages]="thread().items"
                      [pending]="pending()"
                      [meId]="meId()"
                      [otherLastReadAt]="conv.otherLastReadAt"
                      [otherName]="conv.otherUser.name"
                      [hasMore]="thread().hasMore"
                      [loadingOlder]="thread().loadingOlder"
                      [olderError]="thread().olderError"
                      (loadOlder)="messages.loadOlder(conv._id)"
                      (deleteMessage)="deleteMessage($event)"
                      (viewImage)="openLightbox($event)"
                      (retry)="messages.retry($event)"
                      (discard)="messages.discard($event)"
                    />
                  }
                  @default {
                    <app-message-list-skeleton />
                  }
                }
              }

              @if (blockedByMe() || cannotMessage()) {
                <app-composer-notice
                  [name]="conv.otherUser.name"
                  [blockedByMe]="blockedByMe()"
                  [busy]="unblocking()"
                  (unblock)="unblock()"
                />
              } @else {
                <app-composer (sendText)="sendText($event)" (imagePicked)="imageToSend.set($event)" />
              }
            </div>

            @if (panel(); as activePanel) {
              <app-side-panel [title]="panelTitles[activePanel]" (closed)="panel.set(null)">
                @switch (activePanel) {
                  @case ('contact') {
                    <app-profile-view [userId]="conv.otherUser._id" [showMessageAction]="false" />
                  }
                  @case ('media') {
                    <app-media-panel [conversationId]="conv._id" (open)="openLightbox($event)" />
                  }
                  @case ('search') {
                    <app-chat-search-panel [conversationId]="conv._id" [meId]="meId()" [otherName]="conv.otherUser.name" />
                  }
                }
              </app-side-panel>
            }
          </div>

          <app-image-send-sheet [file]="imageToSend()" (send)="sendImage($event)" (cancel)="imageToSend.set(null)" />
          <app-image-lightbox [image]="lightbox()" (closed)="lightbox.set(null)" />
        }
      }
    }
  `,
})
export class ChatPage {
  /** Bound from the :conversationId route parameter. */
  readonly conversationId = input.required<string>();

  private readonly auth = inject(AuthStore);
  private readonly conversations = inject(ConversationsStore);
  private readonly presenceStore = inject(PresenceStore);
  private readonly blocks = inject(BlocksStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  protected readonly messages = inject(MessagesStore);

  protected readonly panelTitles = PANEL_TITLES;
  protected readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  protected readonly loadError = signal<string | null>(null);
  protected readonly panel = signal<ChatPanel | null>(null);
  protected readonly imageToSend = signal<File | null>(null);
  protected readonly lightbox = signal<LightboxImage | null>(null);
  protected readonly unblocking = signal(false);

  protected readonly meId = computed(() => this.auth.me()?._id ?? null);
  protected readonly conversation = computed(() => this.conversations.byId(this.conversationId()));
  protected readonly thread = computed(() => this.messages.thread(this.conversationId()));
  protected readonly pending = computed(() => this.messages.pending(this.conversationId()));
  protected readonly presence = computed(() => {
    const conversation = this.conversation();
    return conversation ? this.presenceStore.of(conversation.otherUser) : null;
  });
  protected readonly blockedByMe = computed(() => {
    const conversation = this.conversation();
    return !!conversation && this.blocks.isBlocked(conversation.otherUser._id);
  });
  protected readonly cannotMessage = computed(() => this.messages.cannotMessage(this.conversationId()));

  constructor() {
    void this.blocks.ensureLoaded();
    effect(() => {
      const id = this.conversationId();
      untracked(() => void this.open(id));
    });
    effect(() => {
      const name = this.conversation()?.otherUser.name;
      this.title.setTitle(name ? `${name} · ChatNest` : 'Chat · ChatNest');
    });
    inject(DestroyRef).onDestroy(() => this.conversations.activeId.set(null));
  }

  protected async open(id: string): Promise<void> {
    this.panel.set(null);
    this.imageToSend.set(null);
    this.lightbox.set(null);
    this.conversations.activeId.set(id);
    const cached = this.conversations.byId(id);
    this.status.set(cached ? 'ready' : 'loading');

    try {
      await this.conversations.fetchOne(id);
    } catch (error) {
      if (this.conversationId() !== id) return;
      const apiError = ApiError.from(error);
      if (apiError.isNotFound || apiError.status === 400) {
        this.status.set('not-found');
        return;
      }
      if (!cached) {
        this.loadError.set(apiError.message);
        this.status.set('error');
        return;
      }
    }
    if (this.conversationId() !== id) return;
    this.status.set('ready');
    await this.messages.loadInitial(id);
    if (this.conversationId() === id) void this.conversations.markRead(id);
  }

  protected reloadMessages(): void {
    void this.messages.loadInitial(this.conversationId());
  }

  protected sendText(text: string): void {
    void this.messages.sendText(this.conversationId(), text);
  }

  protected sendImage(caption: string): void {
    const file = this.imageToSend();
    this.imageToSend.set(null);
    if (file) void this.messages.sendImage(this.conversationId(), file, caption);
  }

  protected openLightbox(message: Message): void {
    if (!message.imageUrl) return;
    this.lightbox.set({
      url: message.imageUrl,
      caption: message.text,
      createdAt: message.createdAt,
      senderLabel: message.sender === this.meId() ? 'You' : (this.conversation()?.otherUser.name ?? ''),
    });
  }

  protected async deleteMessage({ message, scope }: DeleteRequest): Promise<void> {
    const everyone = scope === 'everyone';
    const confirmed = await this.confirm.ask({
      title: everyone ? 'Delete for everyone?' : 'Delete for you?',
      message: everyone
        ? 'This message will be replaced with "This message was deleted" for both of you.'
        : 'This message will be removed from your chat only. The other person will still see it.',
      confirmLabel: everyone ? 'Delete for everyone' : 'Delete for me',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await this.messages.deleteMessage(message, scope);
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
    }
  }

  protected onHeaderAction(action: ChatHeaderAction): void {
    switch (action) {
      case 'contact':
      case 'media':
      case 'search':
        this.panel.set(this.panel() === action ? null : action);
        break;
      case 'block':
        void this.block();
        break;
      case 'unblock':
        void this.unblock();
        break;
      case 'delete':
        void this.deleteChat();
        break;
    }
  }

  private async block(): Promise<void> {
    const user = this.conversation()?.otherUser;
    if (!user) return;
    const confirmed = await this.confirm.ask({
      title: `Block ${user.name}?`,
      message: 'Neither of you will be able to send messages. Your chat history stays. You can unblock them any time.',
      confirmLabel: 'Block',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await this.blocks.block(user);
      this.toast.success(`${user.name} is blocked.`);
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
    }
  }

  protected async unblock(): Promise<void> {
    const user = this.conversation()?.otherUser;
    if (!user || this.unblocking()) return;
    this.unblocking.set(true);
    try {
      await this.blocks.unblock(user._id);
      this.messages.clearCannotMessage(this.conversationId());
      this.toast.success(`${user.name} is unblocked.`);
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
    } finally {
      this.unblocking.set(false);
    }
  }

  private async deleteChat(): Promise<void> {
    const conversation = this.conversation();
    if (!conversation) return;
    const confirmed = await this.confirm.ask({
      title: 'Delete this chat?',
      message: `This clears the chat and its history for you only. ${conversation.otherUser.name} will still see it. If either of you sends a new message, the chat comes back.`,
      confirmLabel: 'Delete chat',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await this.conversations.remove(conversation._id);
      this.toast.success('Chat deleted.');
      await this.router.navigateByUrl('/chats');
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
    }
  }
}
