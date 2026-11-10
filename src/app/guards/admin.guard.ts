import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { AuthStore } from '../store/auth.store';

/** Admin pages. The API enforces the role too; this only keeps users out of screens they can't use. */
export const adminGuard: CanActivateFn = () => {
  if (inject(AuthStore).isAdmin()) return true;
  inject(ToastService).error('You do not have permission to perform this action');
  return inject(Router).createUrlTree(['/chats']);
};
