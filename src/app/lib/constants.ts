/** Limits from docs/API_REFERENCE.md section 4. Client-side validation mirrors these exactly. */
export const LIMITS = {
  nameMax: 50,
  usernameMin: 3,
  usernameMax: 30,
  passwordMin: 8,
  passwordMax: 72,
  bioMax: 150,
  messageTextMax: 2000,
  searchMax: 50,
  imageMaxBytes: 5 * 1024 * 1024,
  pageLimit: 20,
  pageLimitMax: 50,
  messageLimit: 30,
} as const;

/** Usernames are lowercased by the API, so uppercase input is accepted and lowercased before sending. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');

export const DELETE_FOR_EVERYONE_WINDOW_MS = 15 * 60 * 1000;
export const SEARCH_DEBOUNCE_MS = 300;
export const TOKEN_STORAGE_KEY = 'chatnest.token';

/** Exact API messages the UI reacts to. */
export const API_MESSAGES = {
  banned: 'Your account has been banned',
  cannotMessage: 'You cannot message this user',
} as const;

/** Seed accounts from docs section 10, offered as one-click logins in mock mode. */
export const DEMO_PASSWORD = 'Password123!';
export const DEMO_ACCOUNTS = [
  { email: 'aisha@example.com', label: 'Aisha', note: '1 unread photo from Sara' },
  { email: 'sara@example.com', label: 'Sara', note: 'Has blocked Priya' },
  { email: 'rahul@example.com', label: 'Rahul', note: 'Chats with Aisha and Ken' },
  { email: 'admin@chatnest.dev', label: 'Admin', note: 'Can ban and unban users' },
] as const;
