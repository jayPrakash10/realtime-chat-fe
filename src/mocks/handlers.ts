/*
 * MSW handlers for all 20 endpoints in docs/API_REFERENCE.md section 5. They reproduce the
 * documented envelopes, status codes, error messages and side effects, so the UI behaves
 * the same against mocks as against the real backend.
 */
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import type { ValidationDetail } from '../app/api/types';
import { DELETE_FOR_EVERYONE_WINDOW_MS, IMAGE_MIME_TYPES, LIMITS } from '../app/lib/constants';
import { environment } from '../environments/environment';
import { mockBus } from './bus';
import {
  addMessage,
  canMessage,
  conversationView,
  createConversation,
  db,
  findConversationBetween,
  messageView,
  mockToken,
  newObjectId,
  otherParticipantOf,
  parseMockToken,
  participantOf,
  socketMessage,
  toPresenceUser,
  toPublicUser,
  toUser,
  type DbConversation,
  type DbUser,
} from './db';

const API = environment.apiBaseUrl;
const LATENCY_MS = 250;
const USERNAME_RE = /^[a-z0-9_.]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- response helpers ---------- */

class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: ValidationDetail[],
  ) {
    super(message);
  }
}

const ok = (data: unknown, status = 200) => HttpResponse.json({ success: true, data } as JsonBodyType, { status });
const noContent = () => new HttpResponse(null, { status: 204 });

function fail(status: number, message: string, details?: ValidationDetail[]) {
  return HttpResponse.json(
    { success: false, error: { status, message, ...(details ? { details } : {}) } } as JsonBodyType,
    { status },
  );
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  return HttpResponse.json({
    success: true,
    data: items.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  } as JsonBodyType);
}

type Info = { request: Request; params: Record<string, unknown> };

/** Adds latency and turns thrown MockHttpErrors into error envelopes. */
function route(resolver: (info: Info) => Promise<Response> | Response) {
  return async (info: Info) => {
    await delay(LATENCY_MS);
    try {
      return await resolver(info);
    } catch (error) {
      if (error instanceof MockHttpError) return fail(error.status, error.message, error.details);
      console.error('[mock] handler crashed', error);
      return fail(500, 'Internal server error');
    }
  };
}

/* ---------- validation helpers ---------- */

function invalid(details: ValidationDetail[]): never {
  throw new MockHttpError(400, 'Validation failed', details);
}

function requireId(value: unknown, location: ValidationDetail['location'] = 'params', field = 'id'): string {
  const id = typeof value === 'string' ? value : '';
  if (!/^[a-f0-9]{24}$/i.test(id)) invalid([{ location, field, message: `${field} must be a valid id` }]);
  return id;
}

function intParam(url: URL, name: string, fallback: number, max?: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) invalid([{ location: 'query', field: name, message: `${name} must be an integer` }]);
  if (value < 1) invalid([{ location: 'query', field: name, message: `${name} must be greater than or equal to 1` }]);
  if (max !== undefined && value > max) {
    invalid([{ location: 'query', field: name, message: `${name} must be less than or equal to ${max}` }]);
  }
  return value;
}

function paging(url: URL, maxLimit: number = LIMITS.pageLimitMax, defaultLimit: number = LIMITS.pageLimit) {
  return { page: intParam(url, 'page', 1), limit: intParam(url, 'limit', defaultLimit, maxLimit) };
}

function boolParam(url: URL, name: string): boolean | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === '') return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return invalid([{ location: 'query', field: name, message: `${name} must be a boolean` }]);
}

function searchParam(url: URL, name: string): string {
  const value = (url.searchParams.get(name) ?? '').trim();
  if (value.length > LIMITS.searchMax) {
    invalid([{ location: 'query', field: name, message: `${name} length must be less than or equal to ${LIMITS.searchMax} characters long` }]);
  }
  return value;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Mirrors multer: wrong field name → 400, wrong type → 400, too big → 413. */
function readImage(form: FormData, field: string): File | null {
  let file: File | null = null;
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') continue;
    if (key !== field) throw new MockHttpError(400, `Unexpected file field: ${key}`);
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(value.type)) {
      throw new MockHttpError(400, 'Only JPG, PNG and WEBP images are allowed');
    }
    if (value.size > LIMITS.imageMaxBytes) throw new MockHttpError(413, 'Image must be 5 MB or smaller');
    file = value;
  }
  return file;
}

/* ---------- auth ---------- */

function authenticate(request: Request): DbUser {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) throw new MockHttpError(401, 'Authentication required');
  const userId = parseMockToken(header.slice('Bearer '.length));
  if (!userId) throw new MockHttpError(401, 'Invalid or expired token');
  const user = db.users.get(userId);
  if (!user) throw new MockHttpError(401, 'User no longer exists');
  if (user.isBanned) throw new MockHttpError(403, 'Your account has been banned');
  if (Date.now() - Date.parse(user.lastSeenAt) > 60_000) user.lastSeenAt = new Date().toISOString();
  return user;
}

function requireAdmin(request: Request): DbUser {
  const user = authenticate(request);
  if (user.role !== 'admin') throw new MockHttpError(403, 'You do not have permission to perform this action');
  return user;
}

function conversationFor(id: string, user: DbUser): DbConversation {
  const conversation = db.conversations.get(id);
  if (!conversation || !participantOf(conversation, user._id)) throw new MockHttpError(404, 'Conversation not found');
  return conversation;
}

function validateProfileFields(body: Record<string, unknown>, required: boolean): ValidationDetail[] {
  const details: ValidationDetail[] = [];
  if (required || body['name'] !== undefined) {
    const name = str(body['name']);
    if (!name) details.push({ location: 'body', field: 'name', message: 'name is required' });
    else if (name.length > LIMITS.nameMax) {
      details.push({ location: 'body', field: 'name', message: `name length must be less than or equal to ${LIMITS.nameMax} characters long` });
    }
  }
  if (body['bio'] !== undefined && str(body['bio']).length > LIMITS.bioMax) {
    details.push({ location: 'body', field: 'bio', message: `bio length must be less than or equal to ${LIMITS.bioMax} characters long` });
  }
  return details;
}

/* ---------- handlers ---------- */

export const handlers = [
  http.get(`${environment.serverOrigin}/health`, () =>
    ok({ status: 'ok', timestamp: new Date().toISOString() }),
  ),

  /* Auth */
  http.post(
    `${API}/auth/register`,
    route(async ({ request }) => {
      const body = await readJson(request);
      const details = validateProfileFields(body, true);
      const username = str(body['username']).toLowerCase();
      const email = str(body['email']).toLowerCase();
      const password = typeof body['password'] === 'string' ? body['password'] : '';
      if (username.length < LIMITS.usernameMin || username.length > LIMITS.usernameMax) {
        details.push({ location: 'body', field: 'username', message: `username must be ${LIMITS.usernameMin}-${LIMITS.usernameMax} characters` });
      } else if (!USERNAME_RE.test(username)) {
        details.push({ location: 'body', field: 'username', message: 'username may only contain letters, numbers, _ and .' });
      }
      if (!EMAIL_RE.test(email)) details.push({ location: 'body', field: 'email', message: 'email must be a valid email' });
      if (password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax) {
        details.push({ location: 'body', field: 'password', message: `password must be ${LIMITS.passwordMin}-${LIMITS.passwordMax} characters` });
      }
      if (details.length) invalid(details);

      const users = [...db.users.values()];
      if (users.some((user) => user.email === email)) throw new MockHttpError(409, 'That email is already registered');
      if (users.some((user) => user.username === username)) throw new MockHttpError(409, 'That username is already registered');

      const now = new Date().toISOString();
      const user: DbUser = {
        _id: newObjectId(),
        name: str(body['name']),
        username,
        email,
        password,
        role: 'user',
        bio: '',
        avatarUrl: null,
        lastSeenAt: now,
        isBanned: false,
        createdAt: now,
        updatedAt: now,
      };
      db.users.set(user._id, user);
      return ok({ user: toUser(user), token: mockToken(user._id) }, 201);
    }),
  ),

  http.post(
    `${API}/auth/login`,
    route(async ({ request }) => {
      const body = await readJson(request);
      const email = str(body['email']).toLowerCase();
      const password = typeof body['password'] === 'string' ? body['password'] : '';
      const details: ValidationDetail[] = [];
      if (!EMAIL_RE.test(email)) details.push({ location: 'body', field: 'email', message: 'email must be a valid email' });
      if (!password) details.push({ location: 'body', field: 'password', message: 'password is required' });
      if (details.length) invalid(details);

      const user = [...db.users.values()].find((candidate) => candidate.email === email);
      if (!user || user.password !== password) throw new MockHttpError(401, 'Invalid email or password');
      if (user.isBanned) throw new MockHttpError(403, 'Your account has been banned');
      user.lastSeenAt = new Date().toISOString();
      return ok({ user: toUser(user), token: mockToken(user._id) });
    }),
  ),

  http.get(
    `${API}/auth/me`,
    route(({ request }) => ok(toUser(authenticate(request)))),
  ),

  /* Users and profile (static paths before :id) */
  http.get(
    `${API}/users`,
    route(({ request }) => {
      const me = authenticate(request);
      const url = new URL(request.url);
      const search = searchParam(url, 'search').toLowerCase();
      const { page, limit } = paging(url);
      const users = [...db.users.values()]
        .filter((user) => user._id !== me._id && !user.isBanned)
        .filter((user) => !search || user.username.startsWith(search) || user.name.toLowerCase().includes(search))
        .sort((a, b) => a.username.localeCompare(b.username))
        .map(toPublicUser);
      return paginate(users, page, limit);
    }),
  ),

  http.get(
    `${API}/users/me/blocks`,
    route(({ request }) => {
      const me = authenticate(request);
      const { page, limit } = paging(new URL(request.url));
      const entries = db.blocks
        .filter((block) => block.blocker === me._id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((block) => ({ user: toPublicUser(db.users.get(block.blocked)!), blockedAt: block.createdAt }));
      return paginate(entries, page, limit);
    }),
  ),

  http.patch(
    `${API}/users/me`,
    route(async ({ request }) => {
      const me = authenticate(request);
      const body = await readJson(request);
      if (body['name'] === undefined && body['bio'] === undefined) {
        invalid([{ location: 'body', field: '', message: 'Provide at least one of: name, bio' }]);
      }
      const details = validateProfileFields(body, false);
      if (details.length) invalid(details);
      if (body['name'] !== undefined) me.name = str(body['name']);
      if (body['bio'] !== undefined) me.bio = str(body['bio']);
      me.updatedAt = new Date().toISOString();
      return ok(toUser(me));
    }),
  ),

  http.put(
    `${API}/users/me/avatar`,
    route(async ({ request }) => {
      const me = authenticate(request);
      const file = readImage(await request.formData(), 'avatar');
      if (!file) throw new MockHttpError(400, 'An image file is required in the "avatar" field');
      if (me.avatarUrl?.startsWith('blob:')) URL.revokeObjectURL(me.avatarUrl);
      me.avatarUrl = URL.createObjectURL(file);
      me.updatedAt = new Date().toISOString();
      return ok(toUser(me));
    }),
  ),

  http.get(
    `${API}/users/:id`,
    route(({ request, params }) => {
      authenticate(request);
      const user = db.users.get(requireId(params['id']));
      if (!user || user.isBanned) throw new MockHttpError(404, 'User not found');
      return ok(toPresenceUser(user));
    }),
  ),

  /* Blocking */
  http.post(
    `${API}/users/:id/block`,
    route(({ request, params }) => {
      const me = authenticate(request);
      const id = requireId(params['id']);
      if (id === me._id) throw new MockHttpError(400, 'You cannot block yourself');
      if (!db.users.has(id)) throw new MockHttpError(404, 'User not found');
      if (db.blocks.some((block) => block.blocker === me._id && block.blocked === id)) {
        throw new MockHttpError(409, 'User is already blocked');
      }
      const now = new Date().toISOString();
      const block = { _id: newObjectId(), blocker: me._id, blocked: id, createdAt: now, updatedAt: now };
      db.blocks.push(block);
      return ok(block, 201);
    }),
  ),

  http.delete(
    `${API}/users/:id/block`,
    route(({ request, params }) => {
      const me = authenticate(request);
      const id = requireId(params['id']);
      const index = db.blocks.findIndex((block) => block.blocker === me._id && block.blocked === id);
      if (index === -1) throw new MockHttpError(404, 'User is not blocked');
      db.blocks.splice(index, 1);
      return noContent();
    }),
  ),

  /* Conversations */
  http.post(
    `${API}/conversations`,
    route(async ({ request }) => {
      const me = authenticate(request);
      const participantId = requireId((await readJson(request))['participantId'], 'body', 'participantId');
      if (participantId === me._id) throw new MockHttpError(400, 'You cannot start a conversation with yourself');
      const other = db.users.get(participantId);
      if (!other) throw new MockHttpError(404, 'User not found');
      if (!canMessage(me._id, participantId)) throw new MockHttpError(403, 'You cannot message this user');

      const existing = findConversationBetween(me._id, participantId);
      if (existing) {
        participantOf(existing, me._id)!.isHidden = false;
        return ok(conversationView(existing, me._id));
      }
      return ok(conversationView(createConversation(me._id, participantId), me._id), 201);
    }),
  ),

  http.get(
    `${API}/conversations`,
    route(({ request }) => {
      const me = authenticate(request);
      const url = new URL(request.url);
      const unread = boolParam(url, 'unread') ?? false;
      const { page, limit } = paging(url);
      const conversations = [...db.conversations.values()]
        .filter((conversation) => {
          const mine = participantOf(conversation, me._id);
          return !!mine && !mine.isHidden && (!unread || mine.unreadCount > 0);
        })
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
        .map((conversation) => conversationView(conversation, me._id));
      return paginate(conversations, page, limit);
    }),
  ),

  http.get(
    `${API}/conversations/:id`,
    route(({ request, params }) => {
      const me = authenticate(request);
      return ok(conversationView(conversationFor(requireId(params['id']), me), me._id));
    }),
  ),

  http.patch(
    `${API}/conversations/:id/read`,
    route(({ request, params }) => {
      const me = authenticate(request);
      const conversation = conversationFor(requireId(params['id']), me);
      const mine = participantOf(conversation, me._id)!;
      const readAt = new Date().toISOString();
      mine.lastReadAt = readAt;
      mine.unreadCount = 0;
      const other = otherParticipantOf(conversation, me._id);
      mockBus.emit(other.user, { type: 'conversation:read', payload: { conversationId: conversation._id, readerId: me._id, readAt } });
      return ok({ conversationId: conversation._id, lastReadAt: readAt });
    }),
  ),

  http.delete(
    `${API}/conversations/:id`,
    route(({ request, params }) => {
      const me = authenticate(request);
      const mine = participantOf(conversationFor(requireId(params['id']), me), me._id)!;
      mine.isHidden = true;
      mine.clearedAt = new Date().toISOString();
      mine.unreadCount = 0;
      return noContent();
    }),
  ),

  /* Messages */
  http.get(
    `${API}/conversations/:id/messages`,
    route(({ request, params }) => {
      const me = authenticate(request);
      const id = requireId(params['id']);
      const url = new URL(request.url);
      const limit = intParam(url, 'limit', LIMITS.messageLimit, 100);
      const beforeRaw = url.searchParams.get('before');
      const before = beforeRaw ? requireId(beforeRaw, 'query', 'before') : null;
      const type = url.searchParams.get('type');
      if (type && type !== 'text' && type !== 'image') {
        invalid([{ location: 'query', field: 'type', message: 'type must be one of [text, image]' }]);
      }
      const q = searchParam(url, 'q').toLowerCase();
      const conversation = conversationFor(id, me);
      const clearedAt = participantOf(conversation, me._id)!.clearedAt;

      const matches = db.messages
        .filter((message) => message.conversation === conversation._id)
        .filter((message) => !message.deletedFor.includes(me._id))
        .filter((message) => !clearedAt || message.createdAt > clearedAt)
        .filter((message) => !type || message.type === type)
        .filter((message) => !q || message.text.toLowerCase().includes(q))
        .filter((message) => !before || message._id < before)
        .sort((a, b) => (a._id < b._id ? 1 : -1));

      const pageItems = matches.slice(0, limit);
      const hasMore = matches.length > limit;
      return HttpResponse.json({
        success: true,
        data: pageItems.map((message) => messageView(message, me._id)),
        meta: { limit, hasMore, nextCursor: hasMore ? pageItems[pageItems.length - 1]._id : null },
      } as JsonBodyType);
    }),
  ),

  http.post(
    `${API}/conversations/:id/messages`,
    route(async ({ request, params }) => {
      const me = authenticate(request);
      let text = '';
      let file: File | null = null;
      if ((request.headers.get('Content-Type') ?? '').includes('multipart/form-data')) {
        const form = await request.formData();
        file = readImage(form, 'image');
        const caption = form.get('text');
        text = typeof caption === 'string' ? caption.trim() : '';
      } else {
        text = str((await readJson(request))['text']);
      }
      const id = requireId(params['id']);
      if (text.length > LIMITS.messageTextMax) {
        invalid([{ location: 'body', field: 'text', message: `text length must be less than or equal to ${LIMITS.messageTextMax} characters long` }]);
      }
      if (!text && !file) throw new MockHttpError(400, 'A message needs text or an image');
      const conversation = conversationFor(id, me);
      const recipient = otherParticipantOf(conversation, me._id).user;
      if (!canMessage(me._id, recipient)) throw new MockHttpError(403, 'You cannot message this user');

      const message = addMessage(conversation, me._id, {
        type: file ? 'image' : 'text',
        text,
        imageUrl: file ? URL.createObjectURL(file) : null,
      });
      mockBus.emit(recipient, { type: 'message:new', payload: socketMessage(message) });
      mockBus.messageSent(message);
      return ok(messageView(message, me._id), 201);
    }),
  ),

  http.delete(
    `${API}/messages/:id`,
    route(({ request, params }) => {
      const me = authenticate(request);
      const id = requireId(params['id']);
      const scope = new URL(request.url).searchParams.get('scope') ?? 'me';
      if (scope !== 'me' && scope !== 'everyone') {
        invalid([{ location: 'query', field: 'scope', message: 'scope must be one of [me, everyone]' }]);
      }
      const message = db.messages.find((candidate) => candidate._id === id);
      if (!message) throw new MockHttpError(404, 'Message not found');
      const conversation = conversationFor(message.conversation, me);

      if (scope === 'me') {
        if (!message.deletedFor.includes(me._id)) message.deletedFor.push(me._id);
        return noContent();
      }
      if (message.sender !== me._id) throw new MockHttpError(403, 'You can only delete your own messages for everyone');
      if (Date.now() - Date.parse(message.createdAt) >= DELETE_FOR_EVERYONE_WINDOW_MS) {
        throw new MockHttpError(403, 'Messages can only be deleted for everyone within 15 minutes');
      }
      if (message.isDeletedForEveryone) throw new MockHttpError(409, 'Message is already deleted');

      if (message.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(message.imageUrl);
      message.isDeletedForEveryone = true;
      message.text = '';
      message.imageUrl = null;
      message.updatedAt = new Date().toISOString();
      if (conversation.lastMessage?.messageId === message._id) {
        conversation.lastMessage = { ...conversation.lastMessage, isDeleted: true, text: '' };
      }
      const other = otherParticipantOf(conversation, me._id).user;
      mockBus.emit(other, { type: 'message:deleted', payload: { conversationId: conversation._id, messageId: message._id } });
      return noContent();
    }),
  ),

  /* Admin */
  http.get(
    `${API}/admin/users`,
    route(({ request }) => {
      requireAdmin(request);
      const url = new URL(request.url);
      const isBanned = boolParam(url, 'isBanned');
      const search = searchParam(url, 'search').toLowerCase();
      const { page, limit } = paging(url);
      const users = [...db.users.values()]
        .filter((user) => isBanned === undefined || user.isBanned === isBanned)
        .filter((user) => !search || user.username.includes(search) || user.email.includes(search))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toUser);
      return paginate(users, page, limit);
    }),
  ),

  http.patch(
    `${API}/admin/users/:id/ban`,
    route(async ({ request, params }) => {
      const admin = requireAdmin(request);
      const id = requireId(params['id']);
      const isBanned = (await readJson(request))['isBanned'];
      if (typeof isBanned !== 'boolean') {
        invalid([{ location: 'body', field: 'isBanned', message: 'isBanned must be a boolean' }]);
      }
      if (id === admin._id) throw new MockHttpError(400, 'You cannot change your own ban status');
      const user = db.users.get(id);
      if (!user) throw new MockHttpError(404, 'User not found');
      if (user.role === 'admin') throw new MockHttpError(403, 'Admins cannot be banned');
      user.isBanned = isBanned;
      user.updatedAt = new Date().toISOString();
      if (isBanned) db.online.delete(user._id);
      return ok(toUser(user));
    }),
  ),
];
