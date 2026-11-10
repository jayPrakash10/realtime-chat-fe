import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { ApiError } from '../api/api-error';
import { AuthApi } from '../api/auth.api';
import { TokenStorage } from '../api/token-storage';
import type { AuthResult, LoginBody, RegisterBody, User } from '../api/types';
import { ToastService } from '../services/toast.service';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';
export type LogoutReason = 'manual' | 'expired' | 'banned';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly client = inject(ApiClient);
  private readonly tokens = inject(TokenStorage);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private readonly currentUser = signal<User | null>(null);
  private readonly authStatus = signal<AuthStatus>('unknown');
  private readonly bannedNotice = signal(false);

  readonly me = this.currentUser.asReadonly();
  readonly status = this.authStatus.asReadonly();
  /** True after the session ended because the account is banned. Drives the /banned screen. */
  readonly banned = this.bannedNotice.asReadonly();
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  /** Fires after logout so every store can clear its state. */
  readonly loggedOut = new Subject<void>();

  constructor() {
    this.client.authFailures.subscribe((failure) => {
      if (this.authStatus() === 'authenticated') this.logout(failure === 'banned' ? 'banned' : 'expired');
    });
  }

  token(): string | null {
    return this.tokens.get();
  }

  /** App start: validate a stored token with GET /auth/me. */
  async restore(): Promise<void> {
    if (!this.tokens.get()) {
      this.authStatus.set('anonymous');
      return;
    }
    try {
      this.currentUser.set(await this.api.me());
      this.authStatus.set('authenticated');
    } catch (error) {
      const apiError = ApiError.from(error);
      // Keep the token on network errors so a reload can recover once the server is back.
      if (apiError.status === 401 || apiError.status === 403) this.tokens.clear();
      this.bannedNotice.set(apiError.isBanned);
      this.authStatus.set('anonymous');
    }
  }

  async login(body: LoginBody): Promise<void> {
    this.startSession(await this.api.login(body));
  }

  async register(body: RegisterBody): Promise<void> {
    this.startSession(await this.api.register(body));
  }

  /** Re-checks the session (e.g. after the server dropped the socket). 401/403 trigger logout via the interceptor. */
  async verify(): Promise<void> {
    try {
      this.currentUser.set(await this.api.me());
    } catch {
      // Handled globally by ApiClient.authFailures.
    }
  }

  setMe(user: User): void {
    this.currentUser.set(user);
  }

  logout(reason: LogoutReason = 'manual'): void {
    this.tokens.clear();
    this.currentUser.set(null);
    this.authStatus.set('anonymous');
    this.bannedNotice.set(reason === 'banned');
    this.loggedOut.next();
    if (reason === 'expired') this.toast.info('Your session has ended. Please log in again.');
    void this.router.navigateByUrl(reason === 'banned' ? '/banned' : '/login');
  }

  private startSession({ user, token }: AuthResult): void {
    this.tokens.set(token);
    this.bannedNotice.set(false);
    this.currentUser.set(user);
    this.authStatus.set('authenticated');
  }
}
