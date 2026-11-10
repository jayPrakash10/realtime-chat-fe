import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { IconButton } from './icon-button';

/**
 * Right-hand panel inside a chat (contact info, media, search). It overlays the chat below
 * the xl breakpoint and docks as a third column from xl up. Focus moves to its heading on open.
 */
@Component({
  selector: 'app-side-panel',
  imports: [IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'absolute inset-0 z-30 flex flex-col bg-surface xl:static xl:z-auto xl:w-panel xl:shrink-0 xl:border-l xl:border-border',
    role: 'complementary',
    '[attr.aria-labelledby]': 'headingId',
    '(keydown.escape)': 'closed.emit()',
  },
  template: `
    <header class="flex h-15 shrink-0 items-center gap-3 border-b border-border bg-surface-muted px-3">
      <button appIconButton type="button" icon="x" label="Close panel" (click)="closed.emit()"></button>
      <h2 #heading [id]="headingId" tabindex="-1" class="text-base font-semibold text-ink focus:outline-none">
        {{ title() }}
      </h2>
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <ng-content />
    </div>
  `,
})
export class SidePanel {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly headingId = `panel-${Math.random().toString(36).slice(2, 9)}`;
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }
}
