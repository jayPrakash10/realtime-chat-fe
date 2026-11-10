import { Injectable, inject } from '@angular/core';
import { ApiClient, type UploadOptions } from './api-client';
import type { CursorPage, DeleteScope, Message, MessageListQuery } from './types';

@Injectable({ providedIn: 'root' })
export class MessagesApi {
  private readonly api = inject(ApiClient);

  /** Newest first. Pass meta.nextCursor as `before` to load older messages. */
  list(conversationId: string, query: MessageListQuery): Promise<CursorPage<Message>> {
    return this.api.getCursorPage<Message>(`/conversations/${conversationId}/messages`, query);
  }

  sendText(conversationId: string, text: string): Promise<Message> {
    return this.api.post<Message>(`/conversations/${conversationId}/messages`, { text });
  }

  sendImage(conversationId: string, file: File, caption: string, options?: UploadOptions): Promise<Message> {
    const form = new FormData();
    form.append('image', file);
    if (caption) form.append('text', caption);
    return this.api.upload<Message>('post', `/conversations/${conversationId}/messages`, form, options);
  }

  remove(messageId: string, scope: DeleteScope): Promise<void> {
    return this.api.delete(`/messages/${messageId}`, { scope });
  }
}
