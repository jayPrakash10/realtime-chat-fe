/*
 * Stand-in for the Socket.IO connection in mock mode. It forwards bus events to the app and
 * simulates the other person: they come online, read your message, sometimes reply, then go offline.
 */
import type { GatewayHandlers, SocketGateway } from '../app/services/realtime.types';
import { mockBus } from './bus';
import {
  addMessage,
  canMessage,
  db,
  otherParticipantOf,
  parseMockToken,
  participantOf,
  partnersOf,
  socketMessage,
  type DbMessage,
} from './db';

const REPLIES = [
  'Sounds good!',
  'Haha, nice 😄',
  'Let me check and get back to you.',
  'On my way!',
  'Thanks for letting me know.',
  'Can we talk later today?',
  'Love it 🙌',
];

const READ_DELAY_MS = 1500;
const REPLY_DELAY_MS = 3500;
const OFFLINE_AFTER_MS = 20_000;

export class MockSocketGateway implements SocketGateway {
  private userId: string | null = null;
  private cleanups: Array<() => void> = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private offlineTimers = new Map<string, ReturnType<typeof setTimeout>>();

  connect(token: string, handlers: GatewayHandlers): void {
    const userId = parseMockToken(token);
    const user = userId ? db.users.get(userId) : undefined;
    if (!user || user.isBanned) {
      handlers.onStatus('disconnected');
      handlers.onKicked(user ? 'Your account has been banned' : 'Invalid or expired token');
      return;
    }
    this.userId = user._id;
    this.cleanups.push(mockBus.subscribe(user._id, (event) => handlers.onEvent(event)));
    this.cleanups.push(mockBus.onMessageSent((message) => this.simulatePartner(message)));
    db.online.add(user._id);
    handlers.onStatus('connected');

    // Make one chat partner appear online shortly after connecting, to show presence.
    const partner = partnersOf(user._id).find((id) => canMessage(user._id, id));
    if (partner) this.later(2500, () => this.setPresence(partner, true));
  }

  disconnect(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.offlineTimers.clear();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    if (this.userId) {
      db.online.delete(this.userId);
      const user = db.users.get(this.userId);
      if (user) user.lastSeenAt = new Date().toISOString();
    }
    this.userId = null;
  }

  private simulatePartner(message: DbMessage): void {
    const me = this.userId;
    if (!me || message.sender !== me) return;
    const conversation = db.conversations.get(message.conversation);
    if (!conversation) return;
    const partnerId = otherParticipantOf(conversation, me).user;
    if (!canMessage(me, partnerId)) return;

    this.later(READ_DELAY_MS, () => {
      this.setPresence(partnerId, true);
      const readAt = new Date().toISOString();
      const partner = participantOf(conversation, partnerId);
      if (!partner) return;
      partner.lastReadAt = readAt;
      partner.unreadCount = 0;
      mockBus.emit(me, { type: 'conversation:read', payload: { conversationId: conversation._id, readerId: partnerId, readAt } });
    });

    if (Math.random() < 0.7) {
      this.later(REPLY_DELAY_MS, () => {
        if (!canMessage(partnerId, me)) return;
        const text = REPLIES[Math.floor(Math.random() * REPLIES.length)];
        const reply = addMessage(conversation, partnerId, { type: 'text', text, imageUrl: null });
        mockBus.emit(me, { type: 'message:new', payload: socketMessage(reply) });
        this.scheduleOffline(partnerId);
      });
    } else {
      this.scheduleOffline(partnerId);
    }
  }

  private scheduleOffline(userId: string): void {
    const existing = this.offlineTimers.get(userId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(existing);
    }
    this.offlineTimers.set(userId, this.later(OFFLINE_AFTER_MS, () => this.setPresence(userId, false)));
  }

  private setPresence(userId: string, online: boolean): void {
    const me = this.userId;
    const user = db.users.get(userId);
    if (!me || !user || online === db.online.has(userId)) return;
    if (online) {
      db.online.add(userId);
      mockBus.emit(me, { type: 'user:online', payload: { userId } });
    } else {
      db.online.delete(userId);
      user.lastSeenAt = new Date().toISOString();
      mockBus.emit(me, { type: 'user:offline', payload: { userId, lastSeenAt: user.lastSeenAt } });
    }
  }

  private later(ms: number, run: () => void): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, ms);
    this.timers.add(timer);
    return timer;
  }
}
