import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatTime } from '../../../lib/formatters';
import type { PendingMessage } from '../../../lib/message-rows';
import { MessageTicks } from './message-ticks';

/** Optimistic bubble for a message being sent, with upload progress, or Retry/Discard if it failed. */
@Component({
  selector: 'app-pending-bubble',
  imports: [MessageTicks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex justify-end' },
  template: `
    @let p = pending();
    <div
      class="relative flow-root max-w-[85%] rounded-md bg-brand-100 px-2 pt-1.5 pb-2 shadow-bubble sm:max-w-[65%]"
      [class.rounded-tr-none]="groupStart()"
      [class.bubble-tail-out]="groupStart()"
    >
      @if (p.previewUrl) {
        <div class="relative -mx-1 mb-1 overflow-hidden rounded-sm">
          <img [src]="p.previewUrl" alt="Photo being sent" class="max-h-80 w-full min-w-48 object-cover" [class.opacity-70]="p.state === 'sending'" />
          @if (p.state === 'sending') {
            <div
              class="absolute inset-x-0 bottom-0 h-1 bg-ink/20"
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-valuenow]="p.progress"
            >
              <div class="h-full bg-brand-600 transition-[width]" [style.width.%]="p.progress"></div>
            </div>
          }
        </div>
      }
      <p class="text-base wrap-break-word whitespace-pre-wrap text-ink">{{ p.text }}<span
          class="relative top-1.5 float-right ml-3 inline-flex items-center gap-1 text-2xs text-ink-meta"
        >
          <time [attr.datetime]="p.createdAt">{{ time() }}</time>
          <app-message-ticks [status]="p.state === 'failed' ? 'failed' : 'sending'" />
        </span></p>
      @if (p.state === 'failed') {
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-brand-200 pt-1.5 text-xs" role="alert">
          <span class="min-w-0 flex-1 text-danger-700">{{ p.error }}</span>
          <button type="button" class="font-semibold text-brand-700 hover:underline" (click)="retry.emit()">Retry</button>
          <button type="button" class="text-ink-secondary hover:underline" (click)="discard.emit()">Discard</button>
        </div>
      }
    </div>
  `,
})
export class PendingBubble {
  readonly pending = input.required<PendingMessage>();
  readonly groupStart = input(false);
  readonly retry = output<void>();
  readonly discard = output<void>();

  protected readonly time = computed(() => formatTime(this.pending().createdAt));
}
