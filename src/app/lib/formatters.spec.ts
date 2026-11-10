import { calendarDaysAgo, formatChatListTime, formatCount, formatDateSeparator, formatLastSeen, initials } from './formatters';

describe('formatters', () => {
  const now = new Date(2026, 10, 10, 12, 0);
  const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 30).toISOString();

  it('counts calendar days, not 24-hour periods', () => {
    expect(calendarDaysAgo(at(10, 0), now)).toBe(0);
    expect(calendarDaysAgo(at(9, 23), now)).toBe(1);
    expect(calendarDaysAgo(at(3, 12), now)).toBe(7);
  });

  it('labels date separators', () => {
    expect(formatDateSeparator(at(10, 8), now)).toBe('Today');
    expect(formatDateSeparator(at(9, 8), now)).toBe('Yesterday');
    expect(formatDateSeparator(at(1, 8), now)).toContain('2026');
  });

  it('shows the time for today and "Yesterday" in the chat list', () => {
    expect(formatChatListTime(at(10, 8), now)).toMatch(/\d/);
    expect(formatChatListTime(at(9, 8), now)).toBe('Yesterday');
  });

  it('describes last seen', () => {
    expect(formatLastSeen(at(10, 8), now)).toMatch(/^last seen today at /);
    expect(formatLastSeen(at(9, 8), now)).toMatch(/^last seen yesterday at /);
  });

  it('builds initials from the first and last word', () => {
    expect(initials('Aisha Khan')).toBe('AK');
    expect(initials('  sara  ')).toBe('S');
    expect(initials('Mary Jane Watson')).toBe('MW');
    expect(initials('')).toBe('?');
  });

  it('caps badge counts', () => {
    expect(formatCount(7)).toBe('7');
    expect(formatCount(120)).toBe('99+');
  });
});
