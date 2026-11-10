import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../api/api-error';
import type { BlockedUserEntry } from '../../../api/types';
import { formatDate } from '../../../lib/formatters';
import { ToastService } from '../../../services/toast.service';
import { BlocksStore } from '../../../store/blocks.store';
import { Avatar } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { EmptyState } from '../../ui/empty-state';
import { ErrorState } from '../../ui/error-state';
import { Skeleton } from '../../ui/skeleton';

/** GET /users/me/blocks (all pages) with Unblock → DELETE /users/:id/block. */
@Component({
  selector: 'app-blocked-list',
  imports: [RouterLink, Avatar, Button, EmptyState, ErrorState, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (blocks.status()) {
      @case ('error') {
        <app-error-state title="Couldn't load blocked users" [message]="blocks.error()!" (retry)="blocks.reload()" />
      }
      @case ('ready') {
        @if (!blocks.entries().length) {
          <app-empty-state
            icon="ban"
            title="No blocked users"
            description="People you block can't message you, and you can't message them."
          />
        } @else {
          <p class="pb-3 text-sm text-ink-secondary">
            Blocked users can't message you, and you can't message them. They aren't told that you blocked them.
          </p>
          <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border" aria-label="Blocked users">
            @for (entry of blocks.entries(); track entry.user._id) {
              <li class="flex items-center gap-3 px-4 py-3">
                <a [routerLink]="['/users', entry.user._id]" class="flex min-w-0 flex-1 items-center gap-3 rounded-sm">
                  <app-avatar [name]="entry.user.name" [src]="entry.user.avatarUrl" size="sm" />
                  <span class="min-w-0">
                    <span class="block truncate text-base font-medium text-ink">{{ entry.user.name }}</span>
                    <span class="block truncate text-xs text-ink-meta">Blocked {{ blockedOn(entry) }}</span>
                  </span>
                </a>
                <button
                  appButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  [loading]="busyId() === entry.user._id"
                  [attr.aria-label]="'Unblock ' + entry.user.name"
                  (click)="unblock(entry)"
                >
                  Unblock
                </button>
              </li>
            }
          </ul>
        }
      }
      @default {
        <div class="flex flex-col gap-3" role="status" aria-label="Loading blocked users">
          @for (row of [1, 2, 3]; track row) {
            <div class="flex items-center gap-3">
              <app-skeleton class="size-10 rounded-full" />
              <app-skeleton class="h-4 w-1/3 rounded-sm" />
            </div>
          }
        </div>
      }
    }
  `,
})
export class BlockedList {
  protected readonly blocks = inject(BlocksStore);
  private readonly toast = inject(ToastService);

  protected readonly busyId = signal<string | null>(null);

  constructor() {
    void this.blocks.ensureLoaded();
  }

  protected blockedOn(entry: BlockedUserEntry): string {
    return formatDate(entry.blockedAt);
  }

  protected async unblock(entry: BlockedUserEntry): Promise<void> {
    this.busyId.set(entry.user._id);
    try {
      await this.blocks.unblock(entry.user._id);
      this.toast.success(`${entry.user.name} is unblocked.`);
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
    } finally {
      this.busyId.set(null);
    }
  }
}
