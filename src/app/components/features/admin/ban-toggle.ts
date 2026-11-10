import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { User } from '../../../api/types';
import { Button } from '../../ui/button';

/** Ban/Unban action. Hidden for admins and for yourself (docs section 7.6), where a label explains why. */
@Component({
  selector: 'app-ban-toggle',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isSelf()) {
      <span class="text-xs text-ink-meta">This is you</span>
    } @else if (user().role === 'admin') {
      <span class="text-xs text-ink-meta">Can't ban admins</span>
    } @else {
      <button
        appButton
        size="sm"
        type="button"
        [variant]="user().isBanned ? 'secondary' : 'danger'"
        [loading]="busy()"
        [attr.aria-label]="(user().isBanned ? 'Unban ' : 'Ban ') + user().name"
        (click)="toggle.emit(user())"
      >
        {{ user().isBanned ? 'Unban' : 'Ban' }}
      </button>
    }
  `,
})
export class BanToggle {
  readonly user = input.required<User>();
  readonly isSelf = input(false);
  readonly busy = input(false);
  readonly toggle = output<User>();
}
