import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError } from '../api/api-error';
import { BlocksApi } from '../api/blocks.api';
import type { BlockedUserEntry, PublicUser } from '../api/types';
import { LIMITS } from '../lib/constants';
import { AuthStore } from './auth.store';

/**
 * Users the current user has blocked. The API has no "is blocked" flag on users, so the whole
 * list is loaded once (every page) and kept as a set for Block/Unblock buttons.
 */
@Injectable({ providedIn: 'root' })
export class BlocksStore {
  private readonly api = inject(BlocksApi);

  private readonly list = signal<readonly BlockedUserEntry[]>([]);
  private readonly loadStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  private readonly loadError = signal<string | null>(null);
  private inFlight: Promise<void> | null = null;

  readonly entries = this.list.asReadonly();
  readonly status = this.loadStatus.asReadonly();
  readonly error = this.loadError.asReadonly();
  readonly blockedIds = computed(() => new Set(this.list().map((entry) => entry.user._id)));

  constructor() {
    inject(AuthStore).loggedOut.subscribe(() => {
      this.list.set([]);
      this.loadStatus.set('idle');
      this.loadError.set(null);
    });
  }

  isBlocked(userId: string): boolean {
    return this.blockedIds().has(userId);
  }

  ensureLoaded(): Promise<void> {
    if (this.loadStatus() === 'ready') return Promise.resolve();
    this.inFlight ??= this.loadAll().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  reload(): Promise<void> {
    this.loadStatus.set('idle');
    return this.ensureLoaded();
  }

  async block(user: PublicUser): Promise<void> {
    try {
      const block = await this.api.block(user._id);
      const entry: BlockedUserEntry = { user: toPublicUser(user), blockedAt: block.createdAt };
      this.list.update((entries) => [entry, ...entries.filter((existing) => existing.user._id !== user._id)]);
    } catch (error) {
      if (ApiError.from(error).status === 409) void this.reload(); // already blocked elsewhere
      throw error;
    }
  }

  async unblock(userId: string): Promise<void> {
    try {
      await this.api.unblock(userId);
    } catch (error) {
      if (ApiError.from(error).status !== 404) throw error; // 404 = already unblocked
    }
    this.list.update((entries) => entries.filter((entry) => entry.user._id !== userId));
  }

  private async loadAll(): Promise<void> {
    this.loadStatus.set('loading');
    this.loadError.set(null);
    try {
      const all: BlockedUserEntry[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const result = await this.api.list(page, LIMITS.pageLimitMax);
        all.push(...result.items);
        totalPages = result.meta.totalPages;
        page++;
      } while (page <= totalPages);
      this.list.set(all);
      this.loadStatus.set('ready');
    } catch (error) {
      this.loadError.set(ApiError.from(error).message);
      this.loadStatus.set('error');
    }
  }
}

function toPublicUser(user: PublicUser): PublicUser {
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    lastSeenAt: user.lastSeenAt,
  };
}
