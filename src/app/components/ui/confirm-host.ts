import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';
import { Button } from './button';
import { Dialog } from './dialog';

/** Renders ConfirmService requests. Cancel is first in the DOM, so it gets initial focus (the safe default). */
@Component({
  selector: 'app-confirm-host',
  imports: [Dialog, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog
      [open]="!!confirm.request()"
      [title]="confirm.request()?.title ?? ''"
      [showClose]="false"
      (closed)="confirm.settle(false)"
    >
      <p class="text-sm text-ink-secondary">{{ confirm.request()?.message }}</p>
      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button appButton variant="secondary" type="button" (click)="confirm.settle(false)">Cancel</button>
        <button
          appButton
          type="button"
          [variant]="confirm.request()?.tone === 'danger' ? 'danger' : 'primary'"
          (click)="confirm.settle(true)"
        >
          {{ confirm.request()?.confirmLabel }}
        </button>
      </div>
    </app-dialog>
  `,
})
export class ConfirmHost {
  protected readonly confirm = inject(ConfirmService);
}
