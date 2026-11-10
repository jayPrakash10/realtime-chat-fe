import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { IMAGE_ACCEPT, LIMITS } from '../../../lib/constants';
import { validateImageFile } from '../../../lib/file-validation';
import { BreakpointService } from '../../../services/breakpoint.service';
import { ToastService } from '../../../services/toast.service';
import { Autosize } from '../../ui/autosize';
import { IconButton } from '../../ui/icon-button';

let nextComposerId = 0;
const COUNTER_THRESHOLD = 200;

/** Message input. Enter sends on desktop (Shift+Enter for a new line); on touch devices Enter adds a new line. */
@Component({
  selector: 'app-composer',
  imports: [Autosize, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-t border-border bg-surface-muted px-2 py-2 md:px-4' },
  template: `
    <form class="flex items-end gap-2" (submit)="submit($event)">
      <input #file type="file" class="hidden" tabindex="-1" aria-hidden="true" [accept]="accept" (change)="onFileChange($event)" />
      <button appIconButton type="button" icon="paperclip" label="Attach a photo" (click)="file.click()"></button>
      <label [for]="inputId" class="sr-only">Message</label>
      <textarea
        [id]="inputId"
        rows="1"
        class="min-h-10 flex-1 resize-none rounded-lg bg-surface px-4 py-2.5 text-base text-ink placeholder:text-ink-meta focus-visible:outline-offset-0"
        placeholder="Type a message"
        [value]="text()"
        [appAutosize]="text()"
        [attr.aria-describedby]="showCounter() ? inputId + '-counter' : null"
        [attr.aria-invalid]="tooLong() ? 'true' : null"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
      ></textarea>
      <button appIconButton type="submit" icon="send" label="Send message" variant="primary" [disabled]="!canSend()"></button>
    </form>
    @if (showCounter()) {
      <p [id]="inputId + '-counter'" class="mt-1 pr-14 text-right text-xs" [class]="tooLong() ? 'text-danger-600' : 'text-ink-meta'">
        {{ length() }}/{{ max }} characters
      </p>
    }
  `,
})
export class Composer {
  readonly sendText = output<string>();
  readonly imagePicked = output<File>();

  private readonly breakpoints = inject(BreakpointService);
  private readonly toast = inject(ToastService);

  protected readonly inputId = `composer-${++nextComposerId}`;
  protected readonly accept = IMAGE_ACCEPT;
  protected readonly max = LIMITS.messageTextMax;
  protected readonly text = signal('');
  protected readonly length = computed(() => this.text().trim().length);
  protected readonly tooLong = computed(() => this.length() > this.max);
  protected readonly showCounter = computed(() => this.length() > this.max - COUNTER_THRESHOLD);
  protected readonly canSend = computed(() => this.length() > 0 && !this.tooLong());

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !this.breakpoints.isTouch()) {
      event.preventDefault();
      this.send();
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.send();
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    if (!file) return;
    const error = validateImageFile(file);
    if (error) this.toast.error(error);
    else this.imagePicked.emit(file);
  }

  private send(): void {
    if (!this.canSend()) return;
    this.sendText.emit(this.text().trim());
    this.text.set('');
  }
}
