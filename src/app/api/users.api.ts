import { Injectable, inject } from '@angular/core';
import { ApiClient, type UploadOptions } from './api-client';
import type { Page, PublicUser, PublicUserWithPresence, UpdateProfileBody, User, UserSearchQuery } from './types';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly api = inject(ApiClient);

  search(query: UserSearchQuery): Promise<Page<PublicUser>> {
    return this.api.getPage<PublicUser>('/users', query);
  }

  getById(id: string): Promise<PublicUserWithPresence> {
    return this.api.get<PublicUserWithPresence>(`/users/${id}`);
  }

  updateMe(body: UpdateProfileBody): Promise<User> {
    return this.api.patch<User>('/users/me', body);
  }

  uploadAvatar(file: File, options?: UploadOptions): Promise<User> {
    const form = new FormData();
    form.append('avatar', file);
    return this.api.upload<User>('put', '/users/me/avatar', form, options);
  }
}
