import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayout } from '../components/layout/auth-layout';
import { Button } from '../components/ui/button';

@Component({
  selector: 'app-not-found-page',
  imports: [AuthLayout, Button, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout title="Page not found" subtitle="The link may be broken, or the page may have moved.">
      <a appButton routerLink="/chats">Go to chats</a>
    </app-auth-layout>
  `,
})
export class NotFoundPage {}
