import type { LastMessagePreview, Message } from '../api/types';

export interface ChatPreview {
  text: string;
  isMine: boolean;
  isPhoto: boolean;
  /** Placeholder text such as "Say hi" or "This message was deleted", rendered in italics. */
  isMuted: boolean;
}

/** Chat-list preview rules from docs section 7.2. */
export function buildChatPreview(last: LastMessagePreview | null, meId: string | null): ChatPreview {
  if (!last) return { text: 'Say hi 👋', isMine: false, isPhoto: false, isMuted: true };
  const isMine = last.sender === meId;
  if (last.isDeleted) return { text: 'This message was deleted', isMine, isPhoto: false, isMuted: true };
  if (last.type === 'image') return { text: last.text || 'Photo', isMine, isPhoto: true, isMuted: false };
  return { text: last.text, isMine, isPhoto: false, isMuted: false };
}

/** Builds the chat-list preview for a message received over the socket or just sent. */
export function toLastMessagePreview(
  message: Pick<Message, '_id' | 'sender' | 'type' | 'text' | 'isDeletedForEveryone' | 'createdAt'>,
): LastMessagePreview {
  return {
    messageId: message._id,
    sender: message.sender,
    type: message.type,
    text: message.isDeletedForEveryone ? '' : message.text,
    isDeleted: message.isDeletedForEveryone,
    createdAt: message.createdAt,
  };
}
