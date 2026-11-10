import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENT_NAMES, type GatewayHandlers, type RealtimeEvent, type SocketGateway } from './realtime.types';

/** connect_error messages from docs section 6.1 that mean "don't retry". */
const AUTH_ERRORS = new Set([
  'Invalid or expired token',
  'User no longer exists',
  'Your account has been banned',
  'Authentication failed',
]);

export class SocketIoGateway implements SocketGateway {
  private socket: Socket | null = null;

  constructor(private readonly origin: string) {}

  connect(token: string, handlers: GatewayHandlers): void {
    const socket = io(this.origin, { auth: { token } });

    socket.on('connect', () => handlers.onStatus('connected'));

    socket.on('connect_error', (error: Error) => {
      if (AUTH_ERRORS.has(error.message)) {
        socket.disconnect();
        handlers.onStatus('disconnected');
        handlers.onKicked(error.message);
      } else {
        handlers.onStatus('connecting');
      }
    });

    socket.on('disconnect', (reason: string) => {
      if (reason === 'io server disconnect') {
        // Kicked by the server (e.g. banned). Don't reconnect; the app re-checks GET /auth/me.
        handlers.onStatus('disconnected');
        handlers.onKicked(reason);
      } else if (reason !== 'io client disconnect') {
        handlers.onStatus('connecting');
      }
    });

    for (const name of SOCKET_EVENT_NAMES) {
      socket.on(name, (payload: unknown) => handlers.onEvent({ type: name, payload } as RealtimeEvent));
    }

    this.socket = socket;
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }
}
