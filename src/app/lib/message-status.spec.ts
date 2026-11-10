import { canDeleteForEveryone, resolveStatus } from './message-status';

describe('resolveStatus', () => {
  const me = 'a'.repeat(24);
  const other = 'b'.repeat(24);
  const createdAt = '2026-11-10T09:00:00.000Z';

  it('returns null for messages from the other user', () => {
    expect(resolveStatus({ sender: other, createdAt }, me, null)).toBeNull();
  });

  it('trusts the REST status', () => {
    expect(resolveStatus({ sender: me, createdAt, status: 'read' }, me, null)).toBe('read');
  });

  it('derives read state from the other user lastReadAt (socket messages have no status)', () => {
    expect(resolveStatus({ sender: me, createdAt }, me, '2026-11-10T09:00:00.000Z')).toBe('read');
    expect(resolveStatus({ sender: me, createdAt }, me, '2026-11-10T08:59:59.000Z')).toBe('sent');
    expect(resolveStatus({ sender: me, createdAt }, me, null)).toBe('sent');
  });
});

describe('canDeleteForEveryone', () => {
  const me = 'a'.repeat(24);
  const createdAt = '2026-11-10T09:00:00.000Z';
  const sent = Date.parse(createdAt);
  const message = { sender: me, createdAt, isDeletedForEveryone: false };

  it('allows the sender within 15 minutes', () => {
    expect(canDeleteForEveryone(message, me, sent + 14 * 60_000)).toBe(true);
  });

  it('blocks after 15 minutes, for other senders, and for deleted messages', () => {
    expect(canDeleteForEveryone(message, me, sent + 15 * 60_000)).toBe(false);
    expect(canDeleteForEveryone(message, 'b'.repeat(24), sent)).toBe(false);
    expect(canDeleteForEveryone({ ...message, isDeletedForEveryone: true }, me, sent)).toBe(false);
  });
});
