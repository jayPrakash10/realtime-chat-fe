/*
 * In-memory database for mock mode. It models the backend collections (docs/er-diagram.md)
 * and is seeded with the development data from docs section 10. It lives only in this tab.
 */
import type {
  Block,
  Conversation,
  LastMessagePreview,
  Message,
  MessageType,
  PublicUser,
  PublicUserWithPresence,
  Role,
  SocketMessage,
  User,
} from '../app/api/types';
import { toLastMessagePreview } from '../app/lib/chat-preview';

export interface DbUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  bio: string;
  avatarUrl: string | null;
  lastSeenAt: string;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbParticipant {
  user: string;
  lastReadAt: string;
  unreadCount: number;
  isHidden: boolean;
  clearedAt: string | null;
}

export interface DbConversation {
  _id: string;
  participants: [DbParticipant, DbParticipant];
  participantKey: string;
  lastMessage: LastMessagePreview | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbMessage {
  _id: string;
  conversation: string;
  sender: string;
  type: MessageType;
  text: string;
  imageUrl: string | null;
  deletedFor: string[];
  isDeletedForEveryone: boolean;
  createdAt: string;
  updatedAt: string;
}

export const db = {
  users: new Map<string, DbUser>(),
  conversations: new Map<string, DbConversation>(),
  messages: [] as DbMessage[],
  blocks: [] as Block[],
  /** Users with an open (mock) socket. */
  online: new Set<string>(),
};

/* ---------- ids and tokens ---------- */

let sequence = 0;
/**
 * Seed documents get a fixed timestamp prefix (2021) plus their seeding order, so their ids are the
 * same after every page reload: the stored mock token and /chats/:id links keep working.
 * Ids created at runtime use the real clock, so they always sort after the seed data.
 */
const SEED_SECONDS = 0x60000000;
let seeding = true;

/** ObjectId-like: 8 hex chars of seconds + a counter, so ids sort by creation time like MongoDB's. */
export function newObjectId(date: Date = new Date()): string {
  sequence += 1;
  const seconds = seeding ? SEED_SECONDS : Math.floor(date.getTime() / 1000);
  return seconds.toString(16).padStart(8, '0') + sequence.toString(16).padStart(16, '0');
}

const TOKEN_PREFIX = 'mock-token.';
export const mockToken = (userId: string): string => TOKEN_PREFIX + userId;
export function parseMockToken(token: string): string | null {
  return token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
}

/* ---------- views (what the API returns) ---------- */

export function toPublicUser(user: DbUser): PublicUser {
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    lastSeenAt: user.lastSeenAt,
  };
}

export function toPresenceUser(user: DbUser): PublicUserWithPresence {
  return { ...toPublicUser(user), isOnline: db.online.has(user._id) };
}

export function toUser(user: DbUser): User {
  return {
    ...toPublicUser(user),
    email: user.email,
    role: user.role,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function participantOf(conversation: DbConversation, userId: string): DbParticipant | undefined {
  return conversation.participants.find((participant) => participant.user === userId);
}

export function otherParticipantOf(conversation: DbConversation, userId: string): DbParticipant {
  return conversation.participants[0].user === userId ? conversation.participants[1] : conversation.participants[0];
}

export function conversationView(conversation: DbConversation, viewerId: string): Conversation {
  const me = participantOf(conversation, viewerId)!;
  const other = otherParticipantOf(conversation, viewerId);
  const otherUser = db.users.get(other.user)!;
  const cleared = me.clearedAt && conversation.lastMessage && conversation.lastMessage.createdAt <= me.clearedAt;
  return {
    _id: conversation._id,
    otherUser: toPresenceUser(otherUser),
    lastMessage: cleared ? null : conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: me.unreadCount,
    lastReadAt: me.lastReadAt,
    otherLastReadAt: other.lastReadAt,
    createdAt: conversation.createdAt,
  };
}

export function socketMessage(message: DbMessage): SocketMessage {
  return {
    _id: message._id,
    conversation: message.conversation,
    sender: message.sender,
    type: message.type,
    text: message.text,
    imageUrl: message.imageUrl,
    isDeletedForEveryone: message.isDeletedForEveryone,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

/** Adds `status` on the viewer's own messages, like the REST API. */
export function messageView(message: DbMessage, viewerId: string): Message {
  const base = socketMessage(message);
  if (message.sender !== viewerId) return base;
  const conversation = db.conversations.get(message.conversation)!;
  const other = otherParticipantOf(conversation, viewerId);
  return { ...base, status: other.lastReadAt >= message.createdAt ? 'read' : 'sent' };
}

/* ---------- rules ---------- */

export function isBlockedBetween(a: string, b: string): boolean {
  return db.blocks.some(
    (block) => (block.blocker === a && block.blocked === b) || (block.blocker === b && block.blocked === a),
  );
}

/** Sending is allowed when both users exist, neither is banned, and there is no block either way. */
export function canMessage(senderId: string, recipientId: string): boolean {
  const recipient = db.users.get(recipientId);
  const sender = db.users.get(senderId);
  return !!recipient && !!sender && !recipient.isBanned && !sender.isBanned && !isBlockedBetween(senderId, recipientId);
}

export function participantKey(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export function findConversationBetween(a: string, b: string): DbConversation | undefined {
  const key = participantKey(a, b);
  for (const conversation of db.conversations.values()) if (conversation.participantKey === key) return conversation;
  return undefined;
}

export function partnersOf(userId: string): string[] {
  const partners: string[] = [];
  for (const conversation of db.conversations.values()) {
    if (participantOf(conversation, userId)) partners.push(otherParticipantOf(conversation, userId).user);
  }
  return partners;
}

export function createConversation(a: string, b: string, at: Date = new Date()): DbConversation {
  const iso = at.toISOString();
  const participant = (user: string): DbParticipant => ({
    user,
    lastReadAt: iso,
    unreadCount: 0,
    isHidden: false,
    clearedAt: null,
  });
  const conversation: DbConversation = {
    _id: newObjectId(at),
    participants: [participant(a), participant(b)],
    participantKey: participantKey(a, b),
    lastMessage: null,
    lastMessageAt: iso,
    createdAt: iso,
    updatedAt: iso,
  };
  db.conversations.set(conversation._id, conversation);
  return conversation;
}

/** Stores a message with the same side effects as POST /conversations/:id/messages. */
export function addMessage(
  conversation: DbConversation,
  senderId: string,
  input: { type: MessageType; text: string; imageUrl: string | null },
  at: Date = new Date(),
): DbMessage {
  const iso = at.toISOString();
  const message: DbMessage = {
    _id: newObjectId(at),
    conversation: conversation._id,
    sender: senderId,
    type: input.type,
    text: input.text,
    imageUrl: input.imageUrl,
    deletedFor: [],
    isDeletedForEveryone: false,
    createdAt: iso,
    updatedAt: iso,
  };
  db.messages.push(message);
  conversation.lastMessage = toLastMessagePreview(message);
  conversation.lastMessageAt = iso;
  conversation.updatedAt = iso;
  for (const participant of conversation.participants) {
    participant.isHidden = false;
    if (participant.user === senderId) {
      participant.unreadCount = 0;
      participant.lastReadAt = iso;
    } else {
      participant.unreadCount += 1;
    }
  }
  return message;
}

/* ---------- seed (docs section 10) ---------- */

export const SEED_PASSWORD = 'Password123!';

const SUNSET_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
      '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#3d3da3"/><stop offset=".55" stop-color="#e879a6"/><stop offset="1" stop-color="#f6b26b"/>' +
      '</linearGradient></defs><rect width="800" height="600" fill="url(#s)"/>' +
      '<circle cx="400" cy="390" r="90" fill="#fde68a"/>' +
      '<path d="M0 430 160 330l140 90 160-120 160 110 180-70v260H0Z" fill="#1e1b4b"/></svg>',
  );

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

function seedUser(input: { name: string; username: string; email: string; role?: Role; bio?: string; joinedDaysAgo: number }): DbUser {
  const created = minutesAgo(input.joinedDaysAgo * 24 * 60).toISOString();
  const user: DbUser = {
    _id: newObjectId(new Date(created)),
    name: input.name,
    username: input.username,
    email: input.email,
    password: SEED_PASSWORD,
    role: input.role ?? 'user',
    bio: input.bio ?? '',
    avatarUrl: null,
    lastSeenAt: minutesAgo(30 + input.joinedDaysAgo).toISOString(),
    isBanned: false,
    createdAt: created,
    updatedAt: created,
  };
  db.users.set(user._id, user);
  return user;
}

function seed(): void {
  seedUser({ name: 'ChatNest Admin', username: 'admin', email: 'admin@chatnest.dev', role: 'admin', joinedDaysAgo: 30 });
  const aisha = seedUser({ name: 'Aisha Khan', username: 'aisha_k', email: 'aisha@example.com', bio: 'Coffee & code ☕', joinedDaysAgo: 20 });
  const rahul = seedUser({ name: 'Rahul Verma', username: 'rahul.v', email: 'rahul@example.com', bio: 'Backend dev. Ask me about indexes.', joinedDaysAgo: 18 });
  const sara = seedUser({ name: 'Sara Lopez', username: 'sara_l', email: 'sara@example.com', bio: 'Hiking every weekend 🏔️', joinedDaysAgo: 15 });
  const ken = seedUser({ name: 'Ken Tanaka', username: 'ken_t', email: 'ken@example.com', joinedDaysAgo: 10 });
  const priya = seedUser({ name: 'Priya Nair', username: 'priya.n', email: 'priya@example.com', bio: 'Designer', joinedDaysAgo: 5 });

  // Aisha ↔ Rahul: all read
  const aishaRahul = createConversation(aisha._id, rahul._id, minutesAgo(26 * 60));
  addMessage(aishaRahul, rahul._id, { type: 'text', text: 'Hey Aisha! Are we still on for the code review tomorrow?', imageUrl: null }, minutesAgo(25 * 60));
  addMessage(aishaRahul, aisha._id, { type: 'text', text: 'Yes! 10am works for me.', imageUrl: null }, minutesAgo(24 * 60 + 50));
  addMessage(aishaRahul, rahul._id, { type: 'text', text: "Perfect, I'll send the PR link tonight.", imageUrl: null }, minutesAgo(180));
  addMessage(aishaRahul, aisha._id, { type: 'text', text: 'See you then 👋', imageUrl: null }, minutesAgo(60));
  const rahulInAisha = participantOf(aishaRahul, rahul._id)!;
  rahulInAisha.unreadCount = 0;
  rahulInAisha.lastReadAt = minutesAgo(55).toISOString();

  // Aisha ↔ Sara: one unread photo from Sara
  const aishaSara = createConversation(aisha._id, sara._id, minutesAgo(50));
  addMessage(aishaSara, aisha._id, { type: 'text', text: 'How was the hike?', imageUrl: null }, minutesAgo(45));
  participantOf(aishaSara, sara._id)!.unreadCount = 0;
  participantOf(aishaSara, sara._id)!.lastReadAt = minutesAgo(40).toISOString();
  addMessage(aishaSara, sara._id, { type: 'image', text: 'Sunset!', imageUrl: SUNSET_IMAGE }, minutesAgo(20));

  // Rahul ↔ Ken: Ken has one unread message
  const rahulKen = createConversation(rahul._id, ken._id, minutesAgo(16));
  addMessage(rahulKen, rahul._id, { type: 'text', text: 'Ken, can you review my PR when you get a chance?', imageUrl: null }, minutesAgo(15));

  // Sara has blocked Priya
  const blockedAt = minutesAgo(3 * 24 * 60).toISOString();
  db.blocks.push({ _id: newObjectId(new Date(blockedAt)), blocker: sara._id, blocked: priya._id, createdAt: blockedAt, updatedAt: blockedAt });
}

seed();
seeding = false;
