import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon, type IconName } from './icon';

/** Round icon-only control. `label` is required because it is the accessible name. */
@Component({
  selector: 'button[appIconButton], a[appIconButton]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
  },
  template: `<app-icon [name]="icon()" [size]="size() === 'sm' ? 'sm' : 'md'" />`,
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly size = input<'sm' | 'md'>('md');
  readonly variant = input<'ghost' | 'primary'>('ghost');

  protected readonly classes = computed(() => {
    const size = this.size() === 'sm' ? 'size-8' : 'size-10';
    const variant =
      this.variant() === 'primary'
        ? 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200'
        : 'text-ink-secondary hover:bg-border/60 hover:text-ink disabled:opacity-50';
    return `inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${size} ${variant}`;
  });
}
