import type { SocketEvents } from '../api/types';

export const SOCKET_EVENT_NAMES = [
  'message:new',
  'message:deleted',
  'conversation:read',
  'user:online',
  'user:offline',
] as const;

export type SocketEventName = (typeof SOCKET_EVENT_NAMES)[number];

/** A server → client event as a discriminated union, so handlers get typed payloads. */
export type RealtimeEvent = { [K in SocketEventName]: { type: K; payload: SocketEvents[K] } }[SocketEventName];

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface GatewayHandlers {
  onEvent(event: RealtimeEvent): void;
  onStatus(status: ConnectionStatus): void;
  /** The server rejected or dropped this client (bad token, banned). */
  onKicked(reason: string): void;
}

/** Implemented by the real Socket.IO client and by the mock socket. */
export interface SocketGateway {
  connect(token: string, handlers: GatewayHandlers): void;
  disconnect(): void;
}
