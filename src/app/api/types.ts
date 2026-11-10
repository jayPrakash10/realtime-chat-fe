/* Types mirror docs/API_REFERENCE.md section 3 exactly. */

export type ObjectId = string;
export type ISODate = string;

export type Role = 'user' | 'admin';
export type MessageType = 'text' | 'image';
export type MessageStatus = 'sent' | 'read';
export type DeleteScope = 'me' | 'everyone';

/** Safe-to-show profile of any user. */
export interface PublicUser {
  _id: ObjectId;
  name: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  lastSeenAt: ISODate;
}

/** Returned by GET /users/:id and inside Conversation.otherUser. */
export interface PublicUserWithPresence extends PublicUser {
  isOnline: boolean;
}

/** The logged-in user and admin listings. Never includes a password. */
export interface User extends PublicUser {
  email: string;
  role: Role;
  isBanned: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface LastMessagePreview {
  messageId: ObjectId;
  sender: ObjectId;
  type: MessageType;
  text: string;
  isDeleted: boolean;
  createdAt: ISODate;
}

export interface Conversation {
  _id: ObjectId;
  otherUser: PublicUserWithPresence;
  lastMessage: LastMessagePreview | null;
  lastMessageAt: ISODate;
  unreadCount: number;
  lastReadAt: ISODate;
  otherLastReadAt: ISODate;
  createdAt: ISODate;
}

export interface Message {
  _id: ObjectId;
  conversation: ObjectId;
  sender: ObjectId;
  type: MessageType;
  text: string;
  imageUrl: string | null;
  isDeletedForEveryone: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Only on your own messages, and only in REST responses. */
  status?: MessageStatus;
}

export interface Block {
  _id: ObjectId;
  blocker: ObjectId;
  blocked: ObjectId;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface BlockedUserEntry {
  user: PublicUser;
  blockedAt: ISODate;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CursorMeta {
  limit: number;
  hasMore: boolean;
  nextCursor: ObjectId | null;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiPage<T> {
  success: true;
  data: T[];
  meta: PageMeta;
}

export interface ApiCursorPage<T> {
  success: true;
  data: T[];
  meta: CursorMeta;
}

export interface ValidationDetail {
  location: 'body' | 'query' | 'params';
  field: string;
  message: string;
}

/** The error envelope (named ApiError in the docs). */
export interface ApiErrorResponse {
  success: false;
  error: { status: number; message: string; details?: ValidationDetail[] };
}

/* ---------- Socket.IO event payloads (server → client only) ---------- */
export interface SocketEvents {
  'message:new': Omit<Message, 'status'>;
  'message:deleted': { conversationId: ObjectId; messageId: ObjectId };
  'conversation:read': { conversationId: ObjectId; readerId: ObjectId; readAt: ISODate };
  'user:online': { userId: ObjectId };
  'user:offline': { userId: ObjectId; lastSeenAt: ISODate };
}

export type SocketMessage = SocketEvents['message:new'];

/* ---------- Request shapes ---------- */
export interface RegisterBody {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface UpdateProfileBody {
  name?: string;
  bio?: string;
}

export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface UserSearchQuery extends PageQuery {
  search?: string;
}

export interface ConversationListQuery extends PageQuery {
  unread?: boolean;
}

export interface MessageListQuery {
  limit?: number;
  before?: ObjectId;
  type?: MessageType;
  q?: string;
}

export interface AdminUserQuery extends PageQuery {
  isBanned?: boolean;
  search?: string;
}

export interface ReadResult {
  conversationId: ObjectId;
  lastReadAt: ISODate;
}

/* ---------- Unwrapped list results returned by the API services ---------- */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface CursorPage<T> {
  items: T[];
  meta: CursorMeta;
}
