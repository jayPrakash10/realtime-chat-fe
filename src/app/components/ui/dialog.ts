import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconButton } from './icon-button';

let nextDialogId = 0;

/**
 * Modal built on the native <dialog>: focus trapping, Esc handling and the backdrop
 * come from the browser. The parent owns `open` and closes it on (closed).
 */
@Component({
  selector: 'app-dialog',
  imports: [IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      [class]="'dialog dialog-' + size()"
      [attr.aria-labelledby]="titleId"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
    >
      <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header class="flex items-start justify-between gap-4 px-5 pt-5">
          <h2 [id]="titleId" class="text-lg font-semibold text-ink">{{ title() }}</h2>
          @if (showClose()) {
            <button appIconButton type="button" icon="x" label="Close" size="sm" (click)="closed.emit()"></button>
          }
        </header>
        <div class="min-h-0 overflow-y-auto px-5 pt-3 pb-5">
          <ng-content />
        </div>
      </div>
    </dialog>
  `,
})
export class Dialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('sm');
  readonly showClose = input(true);
  readonly closed = output<void>();

  protected readonly titleId = `dialog-title-${++nextDialogId}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterRenderEffect(() => {
      const element = this.dialog().nativeElement;
      if (this.open() && !element.open) element.showModal();
      else if (!this.open() && element.open) element.close();
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  /** Clicks on the ::backdrop target the <dialog> element itself. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.closed.emit();
  }
}
