import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatCount } from '../../lib/formatters';

/** Count pill (unread messages). The visible number is hidden from screen readers in favour of `label`. */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-2xs font-semibold text-white"
      aria-hidden="true"
      >{{ text() }}</span
    >
    <span class="sr-only">{{ label() }}</span>
  `,
})
export class Badge {
  readonly count = input.required<number>();
  readonly label = input.required<string>();

  protected readonly text = computed(() => formatCount(this.count()));
}
