import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { LIMITS } from '../../../lib/constants';
import { describedBy } from '../../../lib/form-errors';
import { Button } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { FormField } from '../../ui/form-field';

/** Preview a picked photo and add an optional caption before sending. */
@Component({
  selector: 'app-image-send-sheet',
  imports: [Button, Dialog, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog [open]="!!file()" title="Send photo" size="md" (closed)="cancel.emit()">
      @if (previewUrl(); as url) {
        <img [src]="url" alt="Selected photo preview" class="mx-auto max-h-[50dvh] rounded-md object-contain" />
      }
      <form class="mt-4 flex flex-col gap-4" (submit)="submit($event)">
        <app-form-field
          label="Caption (optional)"
          fieldId="image-caption"
          [error]="error()"
          [counter]="{ current: caption().trim().length, max: max }"
        >
          <input
            id="image-caption"
            class="input"
            autocomplete="off"
            placeholder="Add a caption"
            [value]="caption()"
            [attr.aria-invalid]="error() ? 'true' : null"
            [attr.aria-describedby]="describedBy('image-caption', error())"
            (input)="onInput($event)"
          />
        </app-form-field>
        <div class="flex justify-end gap-2">
          <button appButton variant="secondary" type="button" (click)="cancel.emit()">Cancel</button>
          <button appButton type="submit" [disabled]="!!error()">Send</button>
        </div>
      </form>
    </app-dialog>
  `,
})
export class ImageSendSheet {
  readonly file = input<File | null>(null);
  readonly send = output<string>();
  readonly cancel = output<void>();

  protected readonly max = LIMITS.messageTextMax;
  protected readonly describedBy = describedBy;
  protected readonly caption = signal('');
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly error = computed(() =>
    this.caption().trim().length > this.max ? `Caption must be at most ${this.max} characters` : null,
  );

  constructor() {
    // A fresh preview URL per file; the cleanup revokes it when the file changes or the sheet is destroyed.
    effect((onCleanup) => {
      const file = this.file();
      this.caption.set('');
      if (!file) {
        this.previewUrl.set(null);
        return;
      }
      const url = URL.createObjectURL(file);
      this.previewUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  protected onInput(event: Event): void {
    this.caption.set((event.target as HTMLInputElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.error()) return;
    this.send.emit(this.caption().trim());
  }
}
