import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import type { Conversation, ConversationListQuery, Page, ReadResult } from './types';

@Injectable({ providedIn: 'root' })
export class ConversationsApi {
  private readonly api = inject(ApiClient);

  /** Idempotent: returns the existing chat with this user, or creates it. */
  open(participantId: string): Promise<Conversation> {
    return this.api.post<Conversation>('/conversations', { participantId });
  }

  list(query: ConversationListQuery): Promise<Page<Conversation>> {
    return this.api.getPage<Conversation>('/conversations', query);
  }

  get(id: string): Promise<Conversation> {
    return this.api.get<Conversation>(`/conversations/${id}`);
  }

  markRead(id: string): Promise<ReadResult> {
    return this.api.patch<ReadResult>(`/conversations/${id}/read`);
  }

  /** "Delete chat" for the current user only. */
  remove(id: string): Promise<void> {
    return this.api.delete(`/conversations/${id}`);
  }
}
