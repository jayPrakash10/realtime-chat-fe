/*
 * Event bus between the mock REST handlers and the mock socket.
 * Handlers emit the same events the real server would push; the mock socket forwards
 * the ones addressed to the connected user.
 */
import type { RealtimeEvent } from '../app/services/realtime.types';
import type { DbMessage } from './db';

type EventListener = (event: RealtimeEvent) => void;
type SentListener = (message: DbMessage) => void;

const listeners = new Map<string, Set<EventListener>>();
const sentListeners = new Set<SentListener>();

export const mockBus = {
  subscribe(userId: string, listener: EventListener): () => void {
    const set = listeners.get(userId) ?? new Set<EventListener>();
    set.add(listener);
    listeners.set(userId, set);
    return () => set.delete(listener);
  },

  /** Delivered on the next tick, after the REST response, like a real push. */
  emit(userId: string, event: RealtimeEvent): void {
    setTimeout(() => listeners.get(userId)?.forEach((listener) => listener(event)), 0);
  },

  onMessageSent(listener: SentListener): () => void {
    sentListeners.add(listener);
    return () => sentListeners.delete(listener);
  },

  messageSent(message: DbMessage): void {
    setTimeout(() => sentListeners.forEach((listener) => listener(message)), 0);
  },
};
