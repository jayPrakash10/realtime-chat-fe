import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../ui/button';
import { Icon } from '../../ui/icon';

/** Replaces the composer when messaging isn't possible (docs section 7.4). */
@Component({
  selector: 'app-composer-notice',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border bg-surface-muted px-4 py-3 text-center',
    role: 'status',
  },
  template: `
    <app-icon [name]="blockedByMe() ? 'lock' : 'ban'" size="sm" class="text-ink-meta" />
    @if (blockedByMe()) {
      <p class="text-sm text-ink-secondary">You blocked {{ name() }}. Unblock to send messages.</p>
      <button appButton variant="ghost" size="sm" type="button" [loading]="busy()" (click)="unblock.emit()">Unblock</button>
    } @else {
      <p class="text-sm text-ink-secondary">You can't message this user.</p>
    }
  `,
})
export class ComposerNotice {
  readonly name = input.required<string>();
  readonly blockedByMe = input(false);
  readonly busy = input(false);
  readonly unblock = output<void>();
}
