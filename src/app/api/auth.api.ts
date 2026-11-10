import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import type { AuthResult, LoginBody, RegisterBody, User } from './types';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);

  register(body: RegisterBody): Promise<AuthResult> {
    return this.api.post<AuthResult>('/auth/register', body);
  }

  login(body: LoginBody): Promise<AuthResult> {
    return this.api.post<AuthResult>('/auth/login', body);
  }

  me(): Promise<User> {
    return this.api.get<User>('/auth/me');
  }
}
