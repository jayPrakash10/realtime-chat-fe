import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Toggle chip for filters (All / Unread). Exposes its state with aria-pressed. */
@Component({
  selector: 'button[appChip]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    '[class]': 'classes()',
    '[attr.aria-pressed]': 'selected()',
  },
  template: `<ng-content />`,
})
export class Chip {
  readonly selected = input(false);

  protected readonly classes = computed(
    () =>
      'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ' +
      (this.selected() ? 'bg-brand-100 text-brand-800' : 'bg-surface-muted text-ink-secondary hover:bg-border'),
  );
}
