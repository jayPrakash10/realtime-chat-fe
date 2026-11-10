import { Injectable, inject, signal } from '@angular/core';
import type { PublicUser, PublicUserWithPresence } from '../api/types';
import { AuthStore } from './auth.store';

export interface Presence {
  isOnline: boolean;
  lastSeenAt: string;
}

/**
 * Live online/last-seen state. REST responses seed it, and socket events keep it current.
 * Components read presence through `of(user)` so every place that shows a user stays in sync.
 */
@Injectable({ providedIn: 'root' })
export class PresenceStore {
  private readonly entries = signal<ReadonlyMap<string, Presence>>(new Map());

  constructor() {
    inject(AuthStore).loggedOut.subscribe(() => this.entries.set(new Map()));
  }

  of(user: PublicUser & { isOnline?: boolean }): Presence {
    return this.entries().get(user._id) ?? { isOnline: user.isOnline ?? false, lastSeenAt: user.lastSeenAt };
  }

  seed(user: PublicUserWithPresence): void {
    this.set(user._id, { isOnline: user.isOnline, lastSeenAt: user.lastSeenAt });
  }

  setOnline(userId: string): void {
    const previous = this.entries().get(userId);
    this.set(userId, { isOnline: true, lastSeenAt: previous?.lastSeenAt ?? new Date().toISOString() });
  }

  setOffline(userId: string, lastSeenAt: string): void {
    this.set(userId, { isOnline: false, lastSeenAt });
  }

  private set(userId: string, presence: Presence): void {
    this.entries.update((map) => new Map(map).set(userId, presence));
  }
}
