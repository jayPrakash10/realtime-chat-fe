const DAY_MS = 86_400_000;

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
const longDateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const mediumDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days between the date and now: 0 = today, 1 = yesterday. */
export function calendarDaysAgo(iso: string, now: Date = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY_MS);
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Chat list: "09:15", "Yesterday", "Monday", "03/11/26". */
export function formatChatListTime(iso: string, now: Date = new Date()): string {
  const days = calendarDaysAgo(iso, now);
  if (days <= 0) return formatTime(iso);
  if (days === 1) return 'Yesterday';
  if (days < 7) return weekdayFormat.format(new Date(iso));
  return shortDateFormat.format(new Date(iso));
}

/** Date pill between messages: "Today", "Yesterday", "Monday", "3 November 2026". */
export function formatDateSeparator(iso: string, now: Date = new Date()): string {
  const days = calendarDaysAgo(iso, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return weekdayFormat.format(new Date(iso));
  return longDateFormat.format(new Date(iso));
}

export function formatLastSeen(iso: string, now: Date = new Date()): string {
  const days = calendarDaysAgo(iso, now);
  if (days <= 0) return `last seen today at ${formatTime(iso)}`;
  if (days === 1) return `last seen yesterday at ${formatTime(iso)}`;
  return `last seen ${longDateFormat.format(new Date(iso))}`;
}

export function formatDate(iso: string): string {
  return mediumDateFormat.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} at ${formatTime(iso)}`;
}

/** "Aisha Khan" → "AK", "sara" → "S". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Badge numbers: 120 → "99+". */
export function formatCount(count: number, max = 99): string {
  return count > max ? `${max}+` : String(count);
}
