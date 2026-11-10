import type { LastMessagePreview } from '../api/types';
import { buildChatPreview, toLastMessagePreview } from './chat-preview';

describe('buildChatPreview', () => {
  const me = 'a'.repeat(24);
  const base: LastMessagePreview = {
    messageId: 'c'.repeat(24),
    sender: me,
    type: 'text',
    text: 'Hello',
    isDeleted: false,
    createdAt: '2026-11-10T09:00:00.000Z',
  };

  it('invites a first message when there is none', () => {
    expect(buildChatPreview(null, me)).toEqual({ text: 'Say hi 👋', isMine: false, isPhoto: false, isMuted: true });
  });

  it('shows deleted messages as a muted placeholder', () => {
    expect(buildChatPreview({ ...base, isDeleted: true, text: '' }, me).text).toBe('This message was deleted');
  });

  it('labels photos, using the caption when present', () => {
    expect(buildChatPreview({ ...base, type: 'image', text: '' }, me)).toMatchObject({ text: 'Photo', isPhoto: true });
    expect(buildChatPreview({ ...base, type: 'image', text: 'Sunset!' }, me).text).toBe('Sunset!');
  });

  it('marks your own messages', () => {
    expect(buildChatPreview(base, me).isMine).toBe(true);
    expect(buildChatPreview(base, 'b'.repeat(24)).isMine).toBe(false);
  });
});

describe('toLastMessagePreview', () => {
  it('blanks the text of messages deleted for everyone', () => {
    const preview = toLastMessagePreview({
      _id: 'c'.repeat(24),
      sender: 'a'.repeat(24),
      type: 'text',
      text: 'secret',
      isDeletedForEveryone: true,
      createdAt: '2026-11-10T09:00:00.000Z',
    });
    expect(preview).toMatchObject({ isDeleted: true, text: '' });
  });
});
