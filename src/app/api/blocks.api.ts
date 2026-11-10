import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import type { Block, BlockedUserEntry, Page } from './types';

@Injectable({ providedIn: 'root' })
export class BlocksApi {
  private readonly api = inject(ApiClient);

  list(page: number, limit: number): Promise<Page<BlockedUserEntry>> {
    return this.api.getPage<BlockedUserEntry>('/users/me/blocks', { page, limit });
  }

  block(userId: string): Promise<Block> {
    return this.api.post<Block>(`/users/${userId}/block`);
  }

  unblock(userId: string): Promise<void> {
    return this.api.delete(`/users/${userId}/block`);
  }
}
