import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../store/auth.store';

/** Logged-in users only. Others go to /login (with a return URL) or to /banned. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (auth.status() === 'authenticated') return true;
  if (auth.banned()) return router.createUrlTree(['/banned']);
  return router.createUrlTree(['/login'], { queryParams: state.url !== '/' ? { returnUrl: state.url } : {} });
};
