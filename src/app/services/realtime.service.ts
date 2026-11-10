import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ConnectionStatus, RealtimeEvent, SocketGateway } from './realtime.types';

/**
 * Owns the single socket connection. The real Socket.IO client and the mock socket
 * are both loaded lazily, so neither ends up in the bundle that doesn't use it.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private gateway: SocketGateway | null = null;
  private connectSeq = 0;
  private readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  readonly status = this.connectionStatus.asReadonly();
  readonly events$ = new Subject<RealtimeEvent>();
  readonly kicked$ = new Subject<string>();

  async connect(token: string): Promise<void> {
    this.disconnect();
    const seq = ++this.connectSeq;
    this.connectionStatus.set('connecting');
    const gateway = await this.createGateway();
    if (seq !== this.connectSeq) return; // logged out while the module was loading
    this.gateway = gateway;
    gateway.connect(token, {
      onEvent: (event) => this.events$.next(event),
      onStatus: (status) => this.connectionStatus.set(status),
      onKicked: (reason) => this.kicked$.next(reason),
    });
  }

  disconnect(): void {
    this.connectSeq++;
    this.gateway?.disconnect();
    this.gateway = null;
    this.connectionStatus.set('disconnected');
  }

  private async createGateway(): Promise<SocketGateway> {
    if (environment.useMocks) {
      const { MockSocketGateway } = await import('../../mocks/mock-socket');
      return new MockSocketGateway();
    }
    const { SocketIoGateway } = await import('./socket-io.gateway');
    return new SocketIoGateway(environment.serverOrigin);
  }
}
