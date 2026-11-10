import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../api/api-error';
import type { PublicUserWithPresence } from '../../../api/types';
import { UsersApi } from '../../../api/users.api';
import { formatLastSeen } from '../../../lib/formatters';
import { ConfirmService } from '../../../services/confirm.service';
import { ToastService } from '../../../services/toast.service';
import { AuthStore } from '../../../store/auth.store';
import { BlocksStore } from '../../../store/blocks.store';
import { ConversationsStore } from '../../../store/conversations.store';
import { PresenceStore } from '../../../store/presence.store';
import { Avatar } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { EmptyState } from '../../ui/empty-state';
import { ErrorState } from '../../ui/error-state';
import { Icon } from '../../ui/icon';
import { Skeleton } from '../../ui/skeleton';

/** Public profile (GET /users/:id) with Message and Block/Unblock actions. Used as a page and as a chat side panel. */
@Component({
  selector: 'app-profile-view',
  imports: [RouterLink, Avatar, Button, EmptyState, ErrorState, Icon, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (status() === 'loading') {
      <div class="flex flex-col items-center gap-3 px-6 py-8" role="status" aria-label="Loading profile">
        <app-skeleton class="size-32 rounded-full" />
        <app-skeleton class="h-6 w-40 rounded-sm" />
        <app-skeleton class="h-4 w-24 rounded-sm" />
      </div>
    } @else if (status() === 'not-found') {
      <app-empty-state icon="user" title="User not found" description="This account doesn't exist or is no longer available." />
    } @else if (status() === 'error') {
      <app-error-state title="Couldn't load this profile" [message]="error()!" (retry)="load(userId())" />
    } @else if (user(); as u) {
      <div class="flex flex-col items-center gap-1 px-6 py-8 text-center">
        <app-avatar [name]="u.name" [src]="u.avatarUrl" size="xl" [online]="presence().isOnline" [alt]="'Profile photo of ' + u.name" />
        <h2 class="mt-3 text-xl font-semibold text-ink">{{ u.name }}</h2>
        <p class="text-sm text-ink-secondary">{{ handle() }}</p>
        <p class="text-sm" [class]="presence().isOnline ? 'text-success-700' : 'text-ink-meta'">{{ presenceText() }}</p>
      </div>

      <div class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pb-8">
        @if (u.bio) {
          <section class="rounded-lg bg-surface-muted p-4 text-left" aria-labelledby="about-heading">
            <h3 id="about-heading" class="text-xs font-semibold tracking-wide text-ink-meta uppercase">About</h3>
            <p class="mt-1 text-sm wrap-break-word whitespace-pre-wrap text-ink">{{ u.bio }}</p>
          </section>
        }

        @if (isMe()) {
          <p class="text-center text-sm text-ink-secondary">This is you.</p>
          <a appButton variant="secondary" routerLink="/settings/profile">Edit profile</a>
        } @else {
          @if (showMessageAction()) {
            <button appButton type="button" [loading]="opening()" [disabled]="isBlocked()" (click)="message()">
              <app-icon name="chat" size="sm" />
              Message
            </button>
          }
          <button
            appButton
            type="button"
            [variant]="isBlocked() ? 'secondary' : 'ghost'"
            [loading]="blockBusy()"
            [disabled]="blocks.status() === 'loading'"
            (click)="toggleBlock()"
          >
            <app-icon [name]="isBlocked() ? 'unlock' : 'ban'" size="sm" />
            {{ isBlocked() ? 'Unblock ' + u.name : 'Block ' + u.name }}
          </button>
          @if (isBlocked()) {
            <p class="text-center text-xs text-ink-meta">You blocked this user. Neither of you can send messages.</p>
          }
        }
      </div>
    }
  `,
})
export class ProfileView {
  readonly userId = input.required<string>();
  readonly showMessageAction = input(true);

  private readonly api = inject(UsersApi);
  private readonly auth = inject(AuthStore);
  private readonly conversations = inject(ConversationsStore);
  private readonly presenceStore = inject(PresenceStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly blocks = inject(BlocksStore);

  protected readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly user = signal<PublicUserWithPresence | null>(null);
  protected readonly opening = signal(false);
  protected readonly blockBusy = signal(false);

  protected readonly isMe = computed(() => this.auth.me()?._id === this.userId());
  protected readonly isBlocked = computed(() => this.blocks.isBlocked(this.userId()));
  protected readonly handle = computed(() => '@' + (this.user()?.username ?? ''));
  protected readonly presence = computed(() => {
    const user = this.user();
    return user ? this.presenceStore.of(user) : { isOnline: false, lastSeenAt: new Date().toISOString() };
  });
  protected readonly presenceText = computed(() =>
    this.presence().isOnline ? 'online' : formatLastSeen(this.presence().lastSeenAt),
  );

  constructor() {
    void this.blocks.ensureLoaded();
    effect(() => {
      const id = this.userId();
      untracked(() => void this.load(id));
    });
  }

  protected async load(id: string): Promise<void> {
    this.status.set('loading');
    try {
      const user = await this.api.getById(id);
      if (id !== this.userId()) return;
      this.presenceStore.seed(user);
      this.user.set(user);
      this.status.set('ready');
    } catch (error) {
      if (id !== this.userId()) return;
      const apiError = ApiError.from(error);
      if (apiError.isNotFound || apiError.status === 400) {
        this.status.set('not-found');
      } else {
        this.error.set(apiError.message);
        this.status.set('error');
      }
    }
  }

  protected async message(): Promise<void> {
    const user = this.user();
    if (!user || this.opening()) return;
    this.opening.set(true);
    try {
      const conversation = await this.conversations.open(user._id);
      await this.router.navigate(['/chats', conversation._id]);
    } catch (error) {
      const apiError = ApiError.from(error);
      this.toast.error(apiError.isCannotMessage ? "You can't message this user." : apiError.message);
    } finally {
      this.opening.set(false);
    }
  }

  protected async toggleBlock(): Promise<void> {
    const user = this.user();
    if (!user) return;
    if (!this.isBlocked()) {
      const confirmed = await this.confirm.ask({
        title: `Block ${user.name}?`,
        message: "Neither of you will be able to send messages. Your chat history stays. You can unblock them any time.",
        confirmLabel: 'Block',
        tone: 'danger',
      });
      if (!confirmed) return;
    }
    this.blockBusy.set(true);
    try {
      if (this.isBlocked()) {
        await this.blocks.unblock(user._id);
        this.toast.success(`${user.name} is unblocked.`);
      } else {
        await this.blocks.block(user);
        this.toast.success(`${user.name} is blocked.`);
      }
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
    } finally {
      this.blockBusy.set(false);
    }
  }
}
