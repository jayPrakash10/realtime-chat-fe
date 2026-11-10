import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConversationsApi } from '../api/conversations.api';
import type { Conversation, ConversationListQuery, Message, Page } from '../api/types';
import { ConversationsStore } from './conversations.store';

const me = 'a'.repeat(24);

function conversation(id: string, unreadCount = 0, lastMessageAt = '2026-11-10T09:00:00.000Z'): Conversation {
  return {
    _id: id.padStart(24, '0'),
    otherUser: {
      _id: id.padStart(24, 'f'),
      name: `User ${id}`,
      username: `user${id}`,
      bio: '',
      avatarUrl: null,
      lastSeenAt: lastMessageAt,
      isOnline: false,
    },
    lastMessage: null,
    lastMessageAt,
    unreadCount,
    lastReadAt: lastMessageAt,
    otherLastReadAt: lastMessageAt,
    createdAt: lastMessageAt,
  };
}

function incoming(conversationId: string, sender: string): Message {
  return {
    _id: 'e'.repeat(24),
    conversation: conversationId,
    sender,
    type: 'text',
    text: 'New!',
    imageUrl: null,
    isDeletedForEveryone: false,
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
  };
}

describe('ConversationsStore', () => {
  let store: ConversationsStore;
  const first = conversation('1');
  const second = conversation('2');

  beforeEach(() => {
    const api: Partial<ConversationsApi> = {
      list: async (query: ConversationListQuery): Promise<Page<Conversation>> => {
        const items = query.unread ? [] : [first, second];
        return { items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } };
      },
      markRead: async (id: string) => ({ conversationId: id, lastReadAt: '2026-11-10T10:01:00.000Z' }),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ConversationsApi, useValue: api }] });
    store = TestBed.inject(ConversationsStore);
  });

  it('loads the first page', async () => {
    await store.load('all');
    expect(store.items().map((c) => c._id)).toEqual([first._id, second._id]);
    expect(store.hasMore()).toBe(false);
  });

  it('moves a chat to the top and counts unread on message:new', async () => {
    await store.load('all');
    await store.applyIncoming(incoming(second._id, second.otherUser._id), false);
    expect(store.items()[0]._id).toBe(second._id);
    expect(store.byId(second._id)?.unreadCount).toBe(1);
    expect(store.byId(second._id)?.lastMessage?.text).toBe('New!');
    expect(store.unreadChats()).toBe(1);
  });

  it('does not count unread for the open chat', async () => {
    await store.load('all');
    await store.applyIncoming(incoming(first._id, first.otherUser._id), true);
    expect(store.byId(first._id)?.unreadCount).toBe(0);
    expect(store.unreadChats()).toBe(0);
  });

  it('clears unread when the chat is marked read', async () => {
    await store.load('all');
    await store.applyIncoming(incoming(second._id, second.otherUser._id), false);
    await store.markRead(second._id);
    expect(store.byId(second._id)?.unreadCount).toBe(0);
    expect(store.unreadChats()).toBe(0);
  });

  it('marks the preview deleted on message:deleted', async () => {
    await store.load('all');
    const message = incoming(first._id, me);
    store.applyOwnMessage(message);
    store.applyDeleted(first._id, message._id);
    expect(store.byId(first._id)?.lastMessage).toMatchObject({ isDeleted: true, text: '' });
  });
});
