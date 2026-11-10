import type { Message, MessageStatus } from '../api/types';
import { DELETE_FOR_EVERYONE_WINDOW_MS } from './constants';

type StatusInput = Pick<Message, 'sender' | 'createdAt' | 'status'>;

/**
 * Read state for a message, or null when it isn't yours.
 * REST messages carry `status`. Socket messages don't, so it is derived from the
 * other user's lastReadAt (docs section 8, rule 8).
 */
export function resolveStatus(message: StatusInput, meId: string | null, otherLastReadAt: string | null): MessageStatus | null {
  if (!meId || message.sender !== meId) return null;
  if (message.status === 'read') return 'read';
  if (otherLastReadAt && Date.parse(message.createdAt) <= Date.parse(otherLastReadAt)) return 'read';
  return 'sent';
}

/** "Delete for everyone" rule: your own message, not already deleted, less than 15 minutes old. */
export function canDeleteForEveryone(
  message: Pick<Message, 'sender' | 'createdAt' | 'isDeletedForEveryone'>,
  meId: string | null,
  now: number = Date.now(),
): boolean {
  return (
    !!meId &&
    message.sender === meId &&
    !message.isDeletedForEveryone &&
    now - Date.parse(message.createdAt) < DELETE_FOR_EVERYONE_WINDOW_MS
  );
}
