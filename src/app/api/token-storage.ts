import { Injectable } from '@angular/core';
import { TOKEN_STORAGE_KEY } from '../lib/constants';

/**
 * Keeps the JWT in localStorage. Every access is guarded because storage can be
 * unavailable (private windows, blocked site data). Without storage the session
 * simply lasts until the page reloads.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private memoryToken: string | null = null;

  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) ?? this.memoryToken;
    } catch {
      return this.memoryToken;
    }
  }

  set(token: string): void {
    this.memoryToken = token;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage unavailable: the in-memory copy keeps this tab working.
    }
  }

  clear(): void {
    this.memoryToken = null;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Nothing stored, nothing to clear.
    }
  }
}
