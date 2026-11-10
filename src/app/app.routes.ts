import type { Routes } from '@angular/router';
import { AppShell, type ShellRouteData } from './components/layout/app-shell';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

const shell = (data: ShellRouteData & { placeholder?: 'chats' | 'search' }) => data;

export const routes: Routes = [
  {
    path: 'login',
    title: 'Log in · ChatNest',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Create account · ChatNest',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'banned',
    title: 'Account banned · ChatNest',
    loadComponent: () => import('./pages/banned-page').then((m) => m.BannedPage),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'chats' },
      {
        path: 'chats',
        title: 'Chats · ChatNest',
        data: shell({ pane: 'chats', detail: false, placeholder: 'chats' }),
        loadComponent: () => import('./pages/placeholder-page').then((m) => m.PlaceholderPage),
      },
      {
        path: 'chats/:conversationId',
        title: 'Chat · ChatNest',
        data: shell({ pane: 'chats', detail: true }),
        loadComponent: () => import('./pages/chat-page').then((m) => m.ChatPage),
      },
      {
        path: 'search',
        title: 'New chat · ChatNest',
        data: shell({ pane: 'search', detail: false, placeholder: 'search' }),
        loadComponent: () => import('./pages/placeholder-page').then((m) => m.PlaceholderPage),
      },
      {
        path: 'users/:userId',
        title: 'Profile · ChatNest',
        data: shell({ pane: 'chats', detail: true }),
        loadComponent: () => import('./pages/user-profile-page').then((m) => m.UserProfilePage),
      },
      {
        path: 'settings',
        title: 'Settings · ChatNest',
        data: shell({ pane: 'settings', detail: false }),
        loadComponent: () => import('./pages/settings-index-page').then((m) => m.SettingsIndexPage),
      },
      {
        path: 'settings/profile',
        title: 'Profile settings · ChatNest',
        data: shell({ pane: 'settings', detail: true }),
        loadComponent: () => import('./pages/settings-profile-page').then((m) => m.SettingsProfilePage),
      },
      {
        path: 'settings/blocked',
        title: 'Blocked users · ChatNest',
        data: shell({ pane: 'settings', detail: true }),
        loadComponent: () => import('./pages/settings-blocked-page').then((m) => m.SettingsBlockedPage),
      },
      {
        path: 'admin/users',
        title: 'Users · Admin · ChatNest',
        canActivate: [adminGuard],
        data: shell({ pane: 'none', detail: true }),
        loadComponent: () => import('./pages/admin-users-page').then((m) => m.AdminUsersPage),
      },
    ],
  },
  {
    path: '**',
    title: 'Page not found · ChatNest',
    loadComponent: () => import('./pages/not-found-page').then((m) => m.NotFoundPage),
  },
];
