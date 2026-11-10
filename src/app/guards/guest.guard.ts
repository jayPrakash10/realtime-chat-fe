import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../store/auth.store';

/** Login and register pages: logged-in users go straight to their chats. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.status() === 'authenticated' ? inject(Router).createUrlTree(['/chats']) : true;
};
