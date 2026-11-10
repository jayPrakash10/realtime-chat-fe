import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import type { AdminUserQuery, Page, User } from './types';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(ApiClient);

  listUsers(query: AdminUserQuery): Promise<Page<User>> {
    return this.api.getPage<User>('/admin/users', query);
  }

  setBan(userId: string, isBanned: boolean): Promise<User> {
    return this.api.patch<User>(`/admin/users/${userId}/ban`, { isBanned });
  }
}
