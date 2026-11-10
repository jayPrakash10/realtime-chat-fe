import type { Message, MessageStatus } from '../api/types';
import { formatDateSeparator } from './formatters';
import { resolveStatus } from './message-status';

/** A message that is still uploading or failed to send. Lives only in the client. */
export interface PendingMessage {
  tempId: string;
  conversationId: string;
  text: string;
  file: File | null;
  previewUrl: string | null;
  createdAt: string;
  state: 'sending' | 'failed';
  progress: number;
  error: string | null;
}

export type MessageRow =
  | { kind: 'date'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; mine: boolean; status: MessageStatus | null; groupStart: boolean }
  | { kind: 'pending'; key: string; pending: PendingMessage; groupStart: boolean };

/**
 * Turns chronological messages (oldest first) plus pending sends into rows with
 * date separators. `groupStart` marks the first bubble of a run from one sender.
 */
export function buildMessageRows(
  messages: readonly Message[],
  pending: readonly PendingMessage[],
  meId: string | null,
  otherLastReadAt: string | null,
  now: Date = new Date(),
): MessageRow[] {
  const rows: MessageRow[] = [];
  let lastDay: string | null = null;
  let lastSender: string | null = null;

  const addDateIfNewDay = (iso: string) => {
    const day = new Date(iso).toDateString();
    if (day === lastDay) return;
    rows.push({ kind: 'date', key: `date-${day}`, label: formatDateSeparator(iso, now) });
    lastDay = day;
    lastSender = null;
  };

  for (const message of messages) {
    addDateIfNewDay(message.createdAt);
    rows.push({
      kind: 'message',
      key: message._id,
      message,
      mine: message.sender === meId,
      status: resolveStatus(message, meId, otherLastReadAt),
      groupStart: message.sender !== lastSender,
    });
    lastSender = message.sender;
  }

  for (const item of pending) {
    addDateIfNewDay(item.createdAt);
    rows.push({ kind: 'pending', key: item.tempId, pending: item, groupStart: lastSender !== meId });
    lastSender = meId;
  }

  return rows;
}
