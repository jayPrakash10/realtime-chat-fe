import type { Message } from '../api/types';
import { buildMessageRows, type PendingMessage } from './message-rows';

const me = 'a'.repeat(24);
const other = 'b'.repeat(24);

function message(id: string, sender: string, createdAt: string): Message {
  return {
    _id: id.padStart(24, '0'),
    conversation: 'c'.repeat(24),
    sender,
    type: 'text',
    text: 'hi',
    imageUrl: null,
    isDeletedForEveryone: false,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('buildMessageRows', () => {
  const now = new Date(2026, 10, 10, 12, 0);
  const yesterday = new Date(2026, 10, 9, 10, 0).toISOString();
  const today = new Date(2026, 10, 10, 9, 0).toISOString();

  it('inserts a date separator per day and marks sender groups', () => {
    const rows = buildMessageRows(
      [message('1', other, yesterday), message('2', other, today), message('3', other, today), message('4', me, today)],
      [],
      me,
      null,
      now,
    );
    expect(rows.map((row) => row.kind)).toEqual(['date', 'message', 'date', 'message', 'message', 'message']);
    const groupStarts = rows.flatMap((row) => (row.kind === 'message' ? [row.groupStart] : []));
    expect(groupStarts).toEqual([true, true, false, true]);
  });

  it('computes read status for own messages from otherLastReadAt', () => {
    const rows = buildMessageRows([message('1', me, today)], [], me, today, now);
    expect(rows[1]).toMatchObject({ kind: 'message', mine: true, status: 'read' });
  });

  it('appends pending messages after sent ones', () => {
    const pending: PendingMessage = {
      tempId: 'pending-1',
      conversationId: 'c'.repeat(24),
      text: 'on its way',
      file: null,
      previewUrl: null,
      createdAt: today,
      state: 'sending',
      progress: 0,
      error: null,
    };
    const rows = buildMessageRows([message('1', me, today)], [pending], me, null, now);
    expect(rows.at(-1)).toMatchObject({ kind: 'pending', key: 'pending-1', groupStart: false });
  });
});
