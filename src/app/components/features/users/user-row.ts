import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PublicUser } from '../../../api/types';
import { Avatar } from '../../ui/avatar';
import { IconButton } from '../../ui/icon-button';
import { Spinner } from '../../ui/spinner';

/** Search result: the row opens the chat, the info button opens the profile. */
@Component({
  selector: 'app-user-row',
  imports: [RouterLink, Avatar, IconButton, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-2 pr-2 transition-colors hover:bg-surface-muted' },
  template: `
    @let u = user();
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left focus-visible:-outline-offset-2 disabled:cursor-wait"
      [disabled]="busy()"
      [attr.aria-label]="'Message ' + u.name + ' (' + handle() + ')'"
      (click)="message.emit()"
    >
      <app-avatar [name]="u.name" [src]="u.avatarUrl" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-base font-medium text-ink">{{ u.name }}</span>
        <span class="block truncate text-sm text-ink-secondary">
          {{ handle() }}@if (u.bio) {<span aria-hidden="true"> · </span>{{ u.bio }}}
        </span>
      </span>
      @if (busy()) {
        <app-spinner size="sm" />
      }
    </button>
    <a appIconButton [routerLink]="['/users', u._id]" icon="info" [label]="'View profile of ' + u.name"></a>
  `,
})
export class UserRow {
  readonly user = input.required<PublicUser>();
  readonly busy = input(false);
  readonly message = output<void>();

  protected handle(): string {
    return '@' + this.user().username;
  }
}
